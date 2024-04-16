import { Plugin } from '@remixproject/engine'

export type SuggestOptions = {
  max_new_tokens: number, 
  temperature: number,
  do_sample:boolean
  top_k: number,
  top_p:number, 
  stream_result:boolean
}
const _paq = (window._paq = window._paq || [])

const profile = {
  name: 'solcoder',
  displayName: 'solcoder',
  description: 'solcoder',
  methods: ['code_generation', 'code_completion', "solidity_answer", "code_explaining", "code_insertion"],
  events: [],
  maintainedBy: 'Remix',
}

type ChatEntry = [string, string];

export class SolCoder extends Plugin {
  api_url: string
  completion_url: string
  solgpt_chat_history:ChatEntry[]
  max_history = 5
  constructor() {
    super(profile)
    this.api_url = "https://solcoder.remixproject.org"
    this.completion_url = "https://completion.remixproject.org"
    this.solgpt_chat_history = []
  }

  async code_generation(prompt): Promise<any> {
    this.emit("aiInfering")
    this.call('layout', 'maximizeTerminal')
    let result
    try {
      result = await(
        await fetch(this.api_url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({"data":[prompt, "code_completion", "", false,1000,0.9,0.92,50]}),
        })
      ).json()
      if ("error" in result){
        this.call('terminal', 'log', { type: 'aitypewriterwarning', value: result.error }) 
        return result
      }
      return result.data
    } catch (e) {
      this.call('terminal', 'log', { type: 'typewritererror', value: `Unable to get a response ${e.message}` })
      return
    }finally {
      this.emit("aiInferingDone")
    }
  }

  async solidity_answer(prompt): Promise<any> {
    this.emit("aiInfering")
    this.call('layout', 'maximizeTerminal')
    let result
    try {
      const main_prompt = this._build_solgpt_promt(prompt)
      result = await(
        await fetch(this.api_url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({"data":[main_prompt, "solidity_answer", false,1000,0.9,0.8,50]}),
        })
      ).json()
    } catch (e) {
      this.call('terminal', 'log', { type: 'typewritererror', value: `Unable to get a response ${e.message}` })
      return
    }finally {
      this.emit("aiInferingDone")
    }
    if (result) {
      this.call('terminal', 'log', { type: 'aitypewriterwarning', value: result.data[0]})
      const chat:ChatEntry = [prompt, result.data[0]]
      this.solgpt_chat_history.push(chat)
      console.log("chathuistory", this.solgpt_chat_history)

      if (this.solgpt_chat_history.length >5){this.solgpt_chat_history.shift()}
    } else if  (result.error) {
      this.call('terminal', 'log', { type: 'aitypewriterwarning', value: "Error on request" })
    }

  }

  async code_explaining(prompt): Promise<any> {
    this.emit("aiInfering")
    this.call('layout', 'maximizeTerminal')
    let result
    try {
      result = await(
        await fetch(this.api_url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({"data":[prompt, "code_explaining", false,2000,0.9,0.8,50]}),
        })
      ).json()
      if (result) {
        this.call('terminal', 'log', { type: 'aitypewriterwarning', value: result.data[0]})
      }
      return result.data[0]
    } catch (e) {
      this.call('terminal', 'log', { type: 'typewritererror', value: `Unable to get a response ${e.message}` })
      return
    }finally {
      this.emit("aiInferingDone")
    }
  }

  async code_completion(prompt, options:SuggestOptions=null): Promise<any> {
    this.emit("aiInfering")
    let result
    try {
      result = await(
        await fetch(this.completion_url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({"data": !options? [
            prompt, // string  in 'context_code' Textbox component	
            "code_completion",
            "", // string  in 'comment' Textbox component		
            false, // boolean  in 'stream_result' Checkbox component		
            30, // number (numeric value between 0 and 2000) in 'max_new_tokens' Slider component		
            0.9, // number (numeric value between 0.01 and 1) in 'temperature' Slider component		
            0.90, // number (numeric value between 0 and 1) in 'top_p' Slider component		
            50, // number (numeric value between 1 and 200) in 'top_k' Slider component
          ] : [
            prompt,
            "code_completion",
            "",
            options.stream_result,
            options.max_new_tokens,
            options.temperature,
            options.top_p,
            options.top_k
          ]}),
        })
      ).json()

      if ("error" in result){
        return result
      }
      return result.data

    } catch (e) {
      this.call('terminal', 'log', { type: 'aitypewriterwarning', value: `Unable to get a response ${e.message}` })
      return
    } finally {
      this.emit("aiInferingDone")
    }
  }

  async code_insertion(msg_pfx, msg_sfx): Promise<any> {
    this.emit("aiInfering")
    let result
    try {
      result = await(
        await fetch(this.completion_url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({"data":[
            msg_pfx, // Text before current cursor line
            "code_insertion",
            msg_sfx, // Text after current cursor line
            1024, 
            0.5,
            0.92,
            50
          ] }),
        })
      ).json()

      if ("error" in result){
        return result
      }
      return result.data

    } catch (e) {
      this.call('terminal', 'log', { type: 'aitypewriterwarning', value: `Unable to get a response ${e.message}` })
      return
    } finally {
      this.emit("aiInferingDone")
    }
  }

  _build_solgpt_promt(user_promt:string){
    if (this.solgpt_chat_history.length === 0){
      return user_promt
    }else{
      let new_promt = ""
      for (const [question, answer] of this.solgpt_chat_history) {
        console.log(question, answer.length)
        new_promt += "### INSTRUCTION:\n" + question.split('sol-gpt')[1] + "\n### RESPONSE:\n" + answer
      }
      // finaly 
      new_promt = "sol-gpt " + new_promt + "### INSTRUCTION:\n" + user_promt.split('sol-gpt')[1] +  "\n### RESPONSE:\n"
      return new_promt
    }

    
  }



}
