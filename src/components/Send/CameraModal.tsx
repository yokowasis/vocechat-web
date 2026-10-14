import { FC, useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { shallowEqual } from "react-redux";

import { useAppSelector } from "@/app/store";
import { ChatContext } from "@/types/common";
import { ContentTypes } from "@/app/config";
import useAddLocalFileMessage from "@/hooks/useAddLocalFileMessage";
import useUploadFile from "@/hooks/useUploadFile";
import Modal from "../Modal";
import IconClose from "@/assets/icons/close.svg";
import IconCamera from "@/assets/icons/camera.photo.svg";
import RefreshIcon from "@/assets/icons/refresh.svg";
import UploadIcon from "@/assets/icons/upload.image.svg";

interface Props {
  context: ChatContext;
  to: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectFilesClick: () => void;
}

const CameraModal: FC<Props> = ({ context, to, isOpen, onClose, onSelectFilesClick }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const from_uid = useAppSelector((store) => store.authData.user?.uid || 0, shallowEqual);
  const addLocalFileMessage = useAddLocalFileMessage({ context, to });
  const { addStageFile } = useUploadFile({ context, id: to });

  // Check if multiple camera devices exist
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === "videoinput");
          setHasMultipleCameras(videoInputs.length > 1);
        })
        .catch(() => {});
    }
  }, []);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(
    async (mode: "user" | "environment") => {
      stopStream();
      setCameraError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera is not supported by your browser.");
        return;
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        let msg = "Could not access camera. Please check your camera permissions.";
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          msg = "Camera permission was denied.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          msg = "No camera device found on this system.";
        }
        setCameraError(msg);
      }
    },
    [stopStream]
  );

  useEffect(() => {
    if (isOpen && !capturedFile) {
      startCamera(facingMode);
    } else if (!isOpen) {
      stopStream();
      if (capturedUrl) {
        URL.revokeObjectURL(capturedUrl);
        setCapturedUrl(null);
        setCapturedFile(null);
      }
    }
    return () => {
      stopStream();
    };
  }, [isOpen, facingMode, capturedFile]);

  useEffect(() => {
    if (videoRef.current && stream && !capturedFile) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, capturedFile]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Failed to capture image.");
          return;
        }
        const fileName = `camera_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        setCapturedFile(file);
        setCapturedUrl(url);
        stopStream();
      },
      "image/jpeg",
      0.92
    );
  };

  const handleRetake = () => {
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
    }
    setCapturedFile(null);
    setCapturedUrl(null);
    startCamera(facingMode);
  };

  const handleToggleFacingMode = () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const handleSendNow = () => {
    if (!capturedFile || !capturedUrl) return;

    const ts = +new Date();
    addLocalFileMessage({
      mid: ts,
      content: capturedUrl,
      content_type: ContentTypes.file,
      created_at: ts,
      properties: {
        content_type: capturedFile.type,
        name: capturedFile.name,
        size: capturedFile.size,
        local_id: ts
      },
      from_uid,
      sending: true
    });

    toast.success("Photo sent!");
    onClose();
  };

  const handleAttachToDraft = () => {
    if (!capturedFile || !capturedUrl) return;

    addStageFile([
      {
        name: capturedFile.name,
        type: capturedFile.type,
        size: capturedFile.size,
        url: capturedUrl
      }
    ]);

    toast.success("Photo added to message draft.");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal mask={true}>
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700 mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100 font-semibold text-base">
            <IconCamera className="w-5 h-5 stroke-current text-primary-500" />
            <span>Camera</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <IconClose className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Viewfinder or Captured Preview */}
        <div className="relative bg-black flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-hidden">
          {capturedUrl ? (
            <img
              src={capturedUrl}
              alt="Captured"
              className="w-full h-full max-h-[60vh] object-contain"
            />
          ) : cameraError ? (
            <div className="flex flex-col items-center justify-center p-8 text-center gap-3 text-gray-300">
              <IconCamera className="w-12 h-12 stroke-current opacity-40" />
              <p className="text-sm max-w-xs">{cameraError}</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSelectFilesClick();
                }}
                className="mt-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Choose Photo or Video from Device
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full max-h-[60vh] object-cover ${
                  facingMode === "user" ? "-scale-x-100" : ""
                }`}
              />
              {/* Switch camera button if multiple cameras exist */}
              {hasMultipleCameras && (
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  title="Switch camera"
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all"
                >
                  <RefreshIcon className="w-5 h-5 fill-current" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/90 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-3">
          {capturedUrl ? (
            <div className="flex items-center justify-between w-full gap-2">
              <button
                type="button"
                onClick={handleRetake}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
              >
                Retake
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAttachToDraft}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-primary-500 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors"
                >
                  Attach to Draft
                </button>
                <button
                  type="button"
                  onClick={handleSendNow}
                  className="px-5 py-2 rounded-lg text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white transition-colors shadow-sm"
                >
                  Send Now
                </button>
              </div>
            </div>
          ) : !cameraError ? (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSelectFilesClick();
                }}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 flex items-center gap-1.5 transition-colors"
              >
                <UploadIcon className="w-4 h-4" />
                <span>Upload from device</span>
              </button>

              <button
                type="button"
                onClick={handleCapture}
                title="Take photo"
                className="cursor-pointer group flex items-center justify-center w-14 h-14 rounded-full border-4 border-primary-500 p-1 hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                <div className="w-full h-full rounded-full bg-primary-500 group-hover:bg-primary-600 transition-colors" />
              </button>

              <div className="w-20" />
            </div>
          ) : (
            <div className="flex justify-end w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CameraModal;
