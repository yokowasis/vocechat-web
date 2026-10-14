import { FC } from "react";
import { useTranslation } from "react-i18next";

import { ChatContext } from "@/types/common";
import ExitFullscreenIcon from "@/assets/icons/fullscreen.exit.svg";
import FullscreenIcon from "@/assets/icons/fullscreen.svg";
import MarkdownIcon from "@/assets/icons/markdown.svg";
import SendIcon from "@/assets/icons/send.svg";
import Tooltip from "../Tooltip";
import AudioRecorder from "./AudioRecorder";
import CameraButton from "./CameraButton";
import LocationButton from "./LocationButton";

type Props = {
  sendMessages: () => void;
  toggleMarkdownFullscreen: () => void;
  fullscreen: boolean;
  toggleMode: () => void;
  mode: "markdown" | "text";
  to: number;
  context: ChatContext;
  sendVisible: boolean;
};
const Toolbar: FC<Props> = ({
  sendMessages,
  sendVisible,
  toggleMarkdownFullscreen,
  fullscreen,
  toggleMode,
  mode,
  to,
  context
}) => {
  const isMarkdown = mode == "markdown";
  return (
    <div className={`flex  items-center justify-end gap-2.5`}>
      <div className="flex cursor-pointer gap-3.5">
        <Tooltip placement="top" tip="Markdown">
          <MarkdownIcon
            className={isMarkdown ? "fill-primary-400" : "dark:fill-gray-300"}
            onClick={toggleMode}
          />
        </Tooltip>
        {isMarkdown &&
          (fullscreen ? (
            <Tooltip placement="top" tip="Exit Fullscreen">
              <ExitFullscreenIcon
                onClick={toggleMarkdownFullscreen}
                className="dark:fill-gray-300"
              />
            </Tooltip>
          ) : (
            <Tooltip placement="top" tip="Fullscreen">
              <FullscreenIcon onClick={toggleMarkdownFullscreen} className="dark:fill-gray-300" />
            </Tooltip>
          ))}
      </div>
      {!isMarkdown && (
        <>
          <CameraButton context={context} to={to} />
          <LocationButton context={context} to={to} />
          <AudioRecorder context={context} to={to} />
          {sendVisible && (
            <Tooltip placement="top" tip="Send">
              <SendIcon
                className={"w-6 h-6 cursor-pointer animate-zoomIn dark:fill-gray-300"}
                onClick={sendMessages.bind(null)}
              />
            </Tooltip>
          )}
        </>
      )}
    </div>
  );
};
export default Toolbar;
