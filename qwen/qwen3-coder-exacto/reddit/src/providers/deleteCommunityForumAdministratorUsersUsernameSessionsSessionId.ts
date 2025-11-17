import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityForumAdministratorUsersUsernameSessionsSessionId(props: {
  administrator: AdministratorPayload;
  username: string;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the user by username
  const user = await MyGlobal.prisma.community_forum_users.findUnique({
    where: {
      username: props.username,
    },
  });

  // If user doesn't exist, throw 404
  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Find the session by ID and verify it belongs to the user
  const session =
    await MyGlobal.prisma.community_forum_user_sessions.findUnique({
      where: {
        id: props.sessionId,
      },
    });

  // If session doesn't exist, throw 404
  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Verify the session belongs to the specified user
  if (session.community_forum_user_id !== user.id) {
    throw new HttpException(
      "Session does not belong to the specified user",
      403,
    );
  }

  // Delete the session
  await MyGlobal.prisma.community_forum_user_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });
}
