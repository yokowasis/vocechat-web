import { FC, ReactElement, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import clsx from "clsx";

import { useAppSelector } from "@/app/store";
import { ChatContext } from "@/types/common";
import ImagePreview from "@/components/ImagePreview";
import Send from "@/components/Send";
import useLicense from "@/hooks/useLicense";
import AddContactTip from "./AddContactTip";
import DMVoice from "./DMVoicing";
import LicenseUpgradeTip from "./LicenseOutdatedTip";
import LoginTip from "./LoginTip";
import Operations from "./Operations";
import VirtualMessageFeed, { VirtualMessageFeedHandle } from "./VirtualMessageFeed";
import { platform } from "@/utils";
import { shallowEqual } from "react-redux";

interface Props {
  readonly?: boolean;
  header: ReactElement;
  aside?: ReactElement | null;
  users?: ReactElement | null;
  voice?: ReactElement | null;
  dropFiles?: File[];
  context: ChatContext;
  to: number;
  feedRef?: React.RefObject<VirtualMessageFeedHandle>;
}

const Layout: FC<Props> = ({
  readonly = false,
  header,
  aside = null,
  feedRef,
  users = null,
  voice = null,
  dropFiles = [],
  context = "channel",
  to
}) => {
  // const { t } = useTranslation('chat');
  const { reachLimit } = useLicense();
  const inputMode = useAppSelector((store) => store.ui.inputMode, shallowEqual);
  const selects = useAppSelector(
    (store) => store.ui.selectMessages[`${context}_${to}`],
    shallowEqual
  );
  const channelsData = useAppSelector((store) => store.channels.byId, shallowEqual);
  const usersData = useAppSelector((store) => store.users.byId, shallowEqual);
  const name = context == "channel" ? channelsData[to]?.name : usersData[to]?.name;
  return (
    <>
      <ImagePreview />
      <section id="CHAT_WRAPPER" className={`relative h-full w-full rounded-r-2xl flex`}>
        <main className="flex flex-col flex-1">
          {header}
          <div className="w-full h-full flex items-start justify-between relative">
            <div className="rounded-br-2xl flex flex-col absolute bottom-0 w-full h-full">
              {context == "dm" && <DMVoice uid={to} />}
              {context == "dm" && <AddContactTip uid={to} />}
              {/* 消息流 */}
              <VirtualMessageFeed ref={feedRef} context={context} id={to} />
              {/* 发送框 */}
              <div className={`px-2 py-0 md:p-4 ${selects ? "selecting" : ""}`}>
                {readonly ? (
                  <LoginTip />
                ) : reachLimit ? (
                  <LicenseUpgradeTip />
                ) : (
                  <div className={clsx(`flex justify-center`, selects && "hidden")}>
                    <Send id={to} context={context} feedRef={feedRef} />
                  </div>
                )}
                {selects && <Operations context={context} id={to} />}
              </div>
            </div>
          </div>
        </main>
        {aside && (
          <div
            className={clsx(
              "flex z-50 p-3 absolute right-0 md:translate-x-full flex-col",
              platform().isWindows ? "top-14 md:top-5" : "top-14 md:top-0"
            )}
          >
            {aside}
          </div>
        )}
        {users && <div className="hidden md:block">{users}</div>}
        {voice && (
          <div className="z-10 max-md:absolute max-md:right-11 max-md:top-14 max-md:overflow-y-scroll bg-white dark:!bg-gray-700 md:block">
            {voice}
          </div>
        )}
      </section>
    </>
  );
};

export default Layout;
