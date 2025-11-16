import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserUsersUserIdSessionsUserSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  userSessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Enforce self-access (user can delete only their own sessions)
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only delete your own sessions.",
      403,
    );
  }

  // Find the session, ensuring it belongs to the correct user
  const session = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: { id: props.userSessionId },
  });

  if (!session) {
    throw new HttpException("Session not found.", 404);
  }

  if (session.user_id !== props.userId) {
    throw new HttpException("Forbidden: You do not own this session.", 403);
  }

  // Hard delete session
  await MyGlobal.prisma.todo_list_user_sessions.delete({
    where: { id: props.userSessionId },
  });
}
