import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteRedditCommunityUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, userId, sessionId } = props;

  const session =
    await MyGlobal.prisma.reddit_community_user_sessions.findFirst({
      where: {
        id: sessionId,
        reddit_community_user_id: userId,
        expired_at: null,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Authorization: user can only delete their own session
  if (user.id !== userId) {
    throw new HttpException("Unauthorized to delete this session", 403);
  }

  await MyGlobal.prisma.reddit_community_user_sessions.delete({
    where: { id: sessionId },
  });
}
