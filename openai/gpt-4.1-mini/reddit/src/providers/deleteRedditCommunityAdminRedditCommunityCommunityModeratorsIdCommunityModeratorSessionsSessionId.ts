import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminRedditCommunityCommunityModeratorsIdCommunityModeratorSessionsSessionId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.reddit_community_community_moderator_sessions.findUnique(
      {
        where: {
          id: props.sessionId,
        },
      },
    );

  if (!existing) {
    throw new HttpException("Community moderator session not found", 404);
  }

  await MyGlobal.prisma.reddit_community_community_moderator_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });
}
