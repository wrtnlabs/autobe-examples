import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditCommunityModeratorModeratorsModeratorIdSessionsSessionId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, moderatorId, sessionId } = props;

  const session =
    await MyGlobal.prisma.reddit_community_moderator_sessions.findUniqueOrThrow(
      {
        where: { id: sessionId },
      },
    );

  if (session.reddit_community_moderator_id !== moderatorId) {
    throw new HttpException(
      "Forbidden: You can only delete your own sessions",
      403,
    );
  }

  await MyGlobal.prisma.reddit_community_moderator_sessions.delete({
    where: { id: sessionId },
  });
}
