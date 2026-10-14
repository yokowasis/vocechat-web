import { FC, useRef, useState, ChangeEvent } from "react";
import toast from "react-hot-toast";
import * as Popover from "@radix-ui/react-popover";

import { ChatContext } from "@/types/common";
import { isMobile } from "@/utils";
import useUploadFile from "@/hooks/useUploadFile";
import Tooltip from "../Tooltip";
import IconCamera from "@/assets/icons/camera.photo.svg";
import IconImage from "@/assets/icons/image.svg";
import CameraModal from "./CameraModal";
import { normalizeImageOrientation } from "./imageUtils";

interface Props {
  context: ChatContext;
  to: number;
}

const ALLOWED_IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "bmp",
  "heic",
  "heif",
  "ico",
  "tiff",
  "avif"
];

const ALLOWED_VIDEO_EXTENSIONS = [
  "mp4",
  "webm",
  "ogg",
  "mov",
  "avi",
  "mkv",
  "m4v",
  "3gp",
  "wmv"
];

export const isAllowedMediaFile = (file: File): boolean => {
  if (file.type) {
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      return true;
    }
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return ALLOWED_IMAGE_EXTENSIONS.includes(ext) || ALLOWED_VIDEO_EXTENSIONS.includes(ext);
};

const CameraButton: FC<Props> = ({ context, to }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { addStageFile } = useUploadFile({ context, id: to });

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const acceptedFiles: File[] = [];
    const rejectedFiles: string[] = [];

    files.forEach((file) => {
      if (isAllowedMediaFile(file)) {
        acceptedFiles.push(file);
      } else {
        rejectedFiles.push(file.name);
      }
    });

    if (rejectedFiles.length > 0) {
      toast.error(
        `Refused unsupported file${
          rejectedFiles.length > 1 ? "s" : ""
        }: ${rejectedFiles.join(", ")}. Only pictures and videos are allowed.`,
        { duration: 4500 }
      );
    }

    if (acceptedFiles.length > 0) {
      // Normalize orientation based on EXIF tags (solves phone portrait photos appearing landscape)
      const normalizedFiles = await Promise.all(
        acceptedFiles.map(async (file) => {
          if (file.type.startsWith("image/")) {
            return await normalizeImageOrientation(file);
          }
          return file;
        })
      );

      const filesData = normalizedFiles.map((file) => {
        const { size, type, name } = file;
        const url = URL.createObjectURL(file);
        return { size, type, name, url };
      });
      addStageFile(filesData);
    }

    // Reset input value so re-selecting the same file fires onChange again
    e.target.value = "";
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleTakePhoto = () => {
    setIsMenuOpen(false);
    if (isMobile()) {
      // Mobile devices support native camera app through file capture input
      cameraInputRef.current?.click();
    } else {
      // Desktop / Web browsers use WebRTC viewfinder modal
      setIsCameraModalOpen(true);
    }
  };

  return (
    <>
      {/* File input for pictures and videos */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Direct camera capture input for mobile devices */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <CameraModal
        context={context}
        to={to}
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onSelectFilesClick={openFileDialog}
      />

      <Popover.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <Tooltip placement="top" tip="Camera & Media">
          <Popover.Trigger asChild>
            <button
              type="button"
              className="cursor-pointer w-6 h-6 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
            >
              <IconCamera className="w-5 h-5 stroke-current" />
            </button>
          </Popover.Trigger>
        </Tooltip>

        <Popover.Portal>
          <Popover.Content
            side="top"
            align="center"
            sideOffset={14}
            className="z-[100] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700/80 p-1 min-w-[190px] flex flex-col gap-0.5 text-sm text-gray-700 dark:text-gray-200 animate-fadeIn"
          >
            <button
              type="button"
              onClick={handleTakePhoto}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/70 text-left transition-colors"
            >
              <IconCamera className="w-4 h-4 stroke-current text-primary-500" />
              <span className="font-medium text-xs md:text-sm">Take Photo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                openFileDialog();
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/70 text-left transition-colors"
            >
              <IconImage className="w-4 h-4 stroke-current text-primary-500" />
              <span className="font-medium text-xs md:text-sm">Photos & Videos</span>
            </button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
};

export default CameraButton;
