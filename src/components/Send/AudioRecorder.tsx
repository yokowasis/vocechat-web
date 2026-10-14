import { FC, useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { shallowEqual } from "react-redux";
import { useTranslation } from "react-i18next";

import { useAppSelector } from "@/app/store";
import { ChatContext } from "@/types/common";
import useUploadFile from "@/hooks/useUploadFile";
import useSendMessage from "@/hooks/useSendMessage";
import IconMic from "@/assets/icons/mic.on.svg";
import IconClose from "@/assets/icons/close.svg";
import IconSend from "@/assets/icons/send.svg";
import Tooltip from "../Tooltip";

interface Props {
  context: ChatContext;
  to: number;
}

const AudioRecorder: FC<Props> = ({ context, to }) => {
  const { t } = useTranslation();
  const from_uid = useAppSelector((store) => store.authData.user?.uid || 0, shallowEqual);
  const { uploadFile } = useUploadFile({ context, id: to });
  const { sendMessage } = useSendMessage({ context, from: from_uid, to });

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Audio recording is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = "";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          mimeType = "audio/ogg";
        }
      }

      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      isCancelledRef.current = false;
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        cleanupStream();

        if (isCancelledRef.current) {
          setIsRecording(false);
          setRecordingDuration(0);
          return;
        }

        const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
        if (elapsedSeconds < 0.6) {
          toast.error("Recording was too short.");
          setIsRecording(false);
          setRecordingDuration(0);
          return;
        }

        const actualMime = mediaRecorder.mimeType || "audio/webm";
        const recordedBlob = new Blob(audioChunksRef.current, { type: actualMime });

        if (recordedBlob.size === 0) {
          toast.error("No audio data recorded.");
          setIsRecording(false);
          setRecordingDuration(0);
          return;
        }

        setIsSending(true);
        const toastId = toast.loading("Sending voice message...");

        try {
          const ext = actualMime.includes("mp4")
            ? "mp4"
            : actualMime.includes("ogg")
            ? "ogg"
            : "webm";
          const fileName = `voice_${Date.now()}.${ext}`;
          const audioFile = new File([recordedBlob], fileName, { type: actualMime });

          const uploadRes = await uploadFile(audioFile);
          if (!uploadRes || !uploadRes.path) {
            toast.error("Failed to upload voice message.", { id: toastId });
            return;
          }

          await sendMessage({
            type: "audio",
            content: { path: uploadRes.path },
            properties: {
              content_type: audioFile.type,
              name: fileName,
              size: audioFile.size,
              local_id: +new Date()
            }
          });

          toast.success("Voice message sent!", { id: toastId });
        } catch (err) {
          console.error("Error sending voice message:", err);
          toast.error("Failed to send voice message.", { id: toastId });
        } finally {
          setIsSending(false);
          setIsRecording(false);
          setRecordingDuration(0);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone error:", err);
      toast.error("Microphone access denied or unavailable.");
    }
  };

  const stopAndSend = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    isCancelledRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    cleanupStream();
    setIsRecording(false);
    setRecordingDuration(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      cleanupStream();
    };
  }, []);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900/60 px-2.5 py-0.5 rounded-full animate-fadeIn shadow-sm">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-mono font-medium text-red-600 dark:text-red-400">
          {formatDuration(recordingDuration)}
        </span>
        <Tooltip placement="top" tip="Cancel recording">
          <button
            type="button"
            onClick={cancelRecording}
            className="cursor-pointer p-1 rounded-full hover:bg-red-200 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 transition-colors"
          >
            <IconClose className="w-3.5 h-3.5 fill-current" />
          </button>
        </Tooltip>
        <Tooltip placement="top" tip="Send voice message">
          <button
            type="button"
            onClick={stopAndSend}
            disabled={isSending}
            className="cursor-pointer p-1 rounded-full bg-primary-500 hover:bg-primary-600 text-white transition-colors"
          >
            <IconSend className="w-3.5 h-3.5 fill-white" />
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <Tooltip placement="top" tip="Record voice message">
      <button
        type="button"
        onClick={startRecording}
        disabled={isSending}
        className="cursor-pointer w-6 h-6 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors disabled:opacity-50"
      >
        <IconMic className="w-5 h-5 fill-current" />
      </button>
    </Tooltip>
  );
};

export default AudioRecorder;
