import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityForumUserUsersUsernameSessionsSessionId(props: {
  user: UserPayload;
  username: string;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First check if the session exists and belongs to the user
  const session =
    await MyGlobal.prisma.community_forum_user_sessions.findUnique({
      where: {
        id: props.sessionId,
      },
      include: {
        user: true,
      },
    });

  // If session doesn't exist, throw 404
  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Check if the session belongs to the specified username
  if (session.user.username !== props.username) {
    throw new HttpException("Session not found", 404);
  }

  // Authorization check:
  // 1. Users can delete their own sessions
  // 2. Administrators can delete any session (would need to be implemented with admin check)
  // For now, we only implement user self-deletion
  if (
    props.user.type === "user" &&
    session.community_forum_user_id !== props.user.id
  ) {
    // For security, we return 404 rather than 403 to avoid revealing session existence
    throw new HttpException("Session not found", 404);
  }

  // Perform the deletion
  await MyGlobal.prisma.community_forum_user_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });
}
