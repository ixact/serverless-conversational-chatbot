import {
    TranscribeStreamingClient,
    StartStreamTranscriptionCommand,
} from "@aws-sdk/client-transcribe-streaming";
import MicrophoneStream from "microphone-stream";
import Button from '@mui/material/Button';
import SettingsVoiceIcon from '@mui/icons-material/SettingsVoice';
import { Stack} from '@mui/material';
import { useState , forwardRef,useImperativeHandle} from "react";
import MicIcon from '@mui/icons-material/Mic';
import { Buffer } from 'buffer';
import Process from 'process';




const Transcribe = forwardRef(function Transcribe(props, ref) {

    /*
    useImperativeHandle(ref, () =>  ({
        stopRecordingExternally(){
              stopRecording();
              
        },
        startRecordingExternally(isStopListeningMode) {
            console.log("mode "+isStopListeningMode);
            setIsSleepMode(isStopListeningMode);
        startRecording(async (callbackText)=>{
            console.log(callbackText);
            console.log("mode2 "+isStopListeningMode);
            setIsSleepMode(isStopListeningMode);
            console.log("setIsSleepMode2 "+isSleepMode);
            if (!isSleepMode)
            {
                console.log(777777);
                if (callbackText.toLowerCase().includes(stopListening))
                {
                    console.log(555555);
                    await  props.handleAddRow(callbackText,"User",true);
                    await  props.handleAddRow("I will no longer listen to your commands. To wake me up, say, Start listening.","Bot",true,true);
                    
                }                    
            }
            else
            {
                console.log(88888888);
                if (callbackText.toLowerCase().includes(startListening))
                {
                    console.log(32222222);
                    await  props.handleAddRow(callbackText, "User", true);
                    await  props.handleAddRow("I will now listen to your commands. To stop listening, say, Stop listening.", "Bot", true,false);
                    
                }
                else
                {
                    console.log(999999);
                    await  props.handleAddRow(callbackText, "User", true,false);
                }
                
            }
        });
        }
    }));
    */

    window.process = Process
    window.Buffer = Buffer;

    const [micColor, setMicColor] = useState('primary')
    const [micVisibility, setMicVisibility] = useState('hidden')
    const [isRecording, setIsRecording] = useState(false)
    const [language, setLanguage] = useState('en-US')
    const stopListening = 'stop listening'
    const startListening = 'start listening'
    const [isSleepMode, setIsSleepMode] = useState(false)



    let microphoneStream = undefined;

    const SAMPLE_RATE = 44100;
    let transcribeClient = undefined;

    const createMicrophoneStream = async () => {
        microphoneStream = new MicrophoneStream();
        microphoneStream.setStream(
            await window.navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true,
            })
        );
    };


  

    const createTranscribeClient = () => {
        transcribeClient = new TranscribeStreamingClient({
            region: import.meta.env.VITE_REGION_NAME,
            credentials: {
                accessKeyId: props.accessKeyId,
                secretAccessKey: props.secretAccessKey,
                sessionToken: props.sessionToken
            },
        });
    };

    const encodePCMChunk = (chunk) => {
        const input = MicrophoneStream.toRaw(chunk);
        let offset = 0;
        const buffer = new ArrayBuffer(input.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < input.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, input[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
        return Buffer.from(buffer);
    };

    const getAudioStream = async function* () {
        for await (const chunk of microphoneStream) {
            if (chunk.length <= SAMPLE_RATE) {
                yield {
                    AudioEvent: {
                        AudioChunk: encodePCMChunk(chunk),
                    },
                };
            }
        }
    };

    const startStreaming = async (language, callback) => {
        const command = new StartStreamTranscriptionCommand({
            LanguageCode: language,
            MediaEncoding: "pcm",
            MediaSampleRateHertz: SAMPLE_RATE,
            AudioStream: getAudioStream(),
        });

        const data = await transcribeClient.send(command);

        for await (const event of data.TranscriptResultStream) {
            const results = event.TranscriptEvent.Transcript.Results;
            if (results.length && !results[0]?.IsPartial) {
                const newTranscript = results[0].Alternatives[0].Transcript;
                console.log("isSleepMode "+isSleepMode);
                //if (isSleepMode)
                  stopRecording();
                
                callback(newTranscript + " ");

            }
        }
    };

    const startRecording = async (callback) => {
        setMicVisibility('visible')
        setIsRecording(!isRecording)
        if (microphoneStream || transcribeClient) {
            stopRecording();
        }
        createTranscribeClient();
        createMicrophoneStream();
        await startStreaming(language, callback);
    };

    const stopRecording = function () {
        
        setMicVisibility('hidden')
        setIsRecording(!isRecording)
        if (microphoneStream) {
            microphoneStream.stop();
            microphoneStream.destroy();
            microphoneStream = undefined;
        }
    };


   


    return (
        <div>
            <Stack spacing={2} direction="row" sx={{ m: 2 }} >
                <Button
                    variant="contained"
                    color={micColor}
                    
                    disabled={!props.accessKeyId && !props.secretAccessKey}
                    startIcon={<SettingsVoiceIcon />}
                    onMouseDown={
                        async (e) => {
                            setMicColor("secondary")
                            e.preventDefault();

                            await startRecording( async (callbackText) => {
                                console.log(callbackText);
                                
                                await  props.handleAddRow(callbackText,"User",false);
                            });
                        }
                    }
                    onMouseUp={
                        async (e) => {
                            setMicColor("primary")
                            e.preventDefault();
                            stopRecording();

                        }
                    }>Talk</Button>
                <MicIcon style={{ fontSize: 20, color: 'red' }} sx={{ visibility: micVisibility }} />
               
            </Stack>


        </div>
    );

}
///////
)

export default Transcribe;