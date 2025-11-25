import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function getDiscussionBoardRegisteredUserRegisteredUsersUserIdSessionsSessionId(props: {
  registeredUser: RegisteredUserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardRegisteredUserSession> {
  // Database query
  const session =
    await MyGlobal.prisma.discussion_board_registered_user_sessions.findUnique({
      where: {
        id: props.sessionId,
        registered_user_id: props.userId,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Verify ownership
  if (session.registered_user_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Determine session status with proper null checking
  const status =
    session.expired_at &&
    toISOStringSafe(new Date(session.expired_at)) < toISOStringSafe(new Date())
      ? "inactive"
      : "active";

  // Format response with complete device info handling
  return {
    id: session.id,
    userId: session.registered_user_id,
    createdAt: toISOStringSafe(new Date(session.created_at)),
    lastActivity: toISOStringSafe(new Date(session.created_at)),
    status,
    deviceInfo: session.ip
      ? {
          ipAddress: session.ip,
          browser: "",
          deviceType: "",
        }
      : undefined,
  } satisfies IDiscussionBoardRegisteredUserSession;
}
