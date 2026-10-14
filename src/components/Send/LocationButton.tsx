import { FC, useState } from "react";
import toast from "react-hot-toast";
import { shallowEqual } from "react-redux";

import { useAppSelector } from "@/app/store";
import { ChatContext } from "@/types/common";
import useSendMessage from "@/hooks/useSendMessage";
import Tooltip from "../Tooltip";
import IconLocation from "@/assets/icons/location.svg";

interface Props {
  context: ChatContext;
  to: number;
}

const LocationButton: FC<Props> = ({ context, to }) => {
  const [isLocating, setIsLocating] = useState(false);
  const from_uid = useAppSelector((store) => store.authData.user?.uid || 0, shallowEqual);
  const { sendMessage } = useSendMessage({ context, from: from_uid, to });

  const handleSendLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    const toastId = toast.loading("Getting current location...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const mapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

          await sendMessage({
            type: "text",
            content: mapUrl,
            properties: {
              local_id: +new Date()
            }
          });

          toast.success("Location sent!", { id: toastId });
        } catch (err) {
          console.error("Failed to send location:", err);
          toast.error("Failed to send location.", { id: toastId });
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        let errorMsg = "Unable to retrieve your location.";
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = "Location permission denied. Please allow location access in your browser.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMsg = "Location information is unavailable.";
        } else if (err.code === err.TIMEOUT) {
          errorMsg = "Location request timed out.";
        }
        toast.error(errorMsg, { id: toastId });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <Tooltip placement="top" tip="Send current location">
      <button
        type="button"
        onClick={handleSendLocation}
        disabled={isLocating}
        className="cursor-pointer w-6 h-6 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors disabled:opacity-50"
      >
        <IconLocation className={`w-5 h-5 stroke-current ${isLocating ? "animate-pulse text-primary-500" : ""}`} />
      </button>
    </Tooltip>
  );
};

export default LocationButton;
