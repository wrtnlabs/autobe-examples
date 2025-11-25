import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListLogoutResponse";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserAuthUserLogout(props: {
  user: UserPayload & { jti: string };
}): Promise<ITodoListLogoutResponse> {
  const now = new Date();
  const nowIso = toISOStringSafe(now);

  // Verify session exists and is active
  const session = await MyGlobal.prisma.todo_list_sessions.findUnique({
    where: {
      id: props.user.session_id,
    },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.expired_at !== null) {
    throw new HttpException("Session is already expired", 400);
  }

  // Mark session as expired
  await MyGlobal.prisma.todo_list_sessions.update({
    where: {
      id: props.user.session_id,
    },
    data: {
      expired_at: now,
    },
  });

  // Add token to blacklist with 'logout' reason
  const tokenExpiresAt = new Date(session.absolute_timeout_at);

  await MyGlobal.prisma.todo_list_token_blacklist.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_list_user_id: props.user.id,
      token_jti: props.user.jti,
      revoked_at: now,
      expires_at: tokenExpiresAt,
      revocation_reason: "logout",
    },
  });

  // Return success response
  return {
    success: true,
    message: "You have been logged out from this device.",
    sessions_affected: 1,
    logout_completed_at: nowIso,
  };
}
