import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminGuestsGuestIdSessionsSessionId(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, guestId, sessionId } = props;

  // Verify session exists with specified guestId and sessionId
  const session =
    await MyGlobal.prisma.reddit_community_guest_sessions.findFirst({
      where: {
        id: sessionId,
        reddit_community_guest_id: guestId,
      },
    });

  if (!session) {
    throw new HttpException("Guest session not found", 404);
  }

  // Hard delete the session
  await MyGlobal.prisma.reddit_community_guest_sessions.delete({
    where: {
      id: sessionId,
    },
  });
}
