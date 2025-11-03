import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminGuestsGuestIdSessionsSessionId(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, guestId, sessionId } = props;

  // Calculate new expiration time as ISO string (current time + 1 hour)
  const newExpiredAt = toISOStringSafe(new Date(Date.now() + 3600000));

  await MyGlobal.prisma.reddit_community_guest_sessions.update({
    where: {
      id: sessionId,
    },
    data: {
      expired_at: newExpiredAt,
    },
  });
}
