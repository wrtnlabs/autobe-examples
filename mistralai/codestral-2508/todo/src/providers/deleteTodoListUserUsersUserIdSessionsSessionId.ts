import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Ensure only the authenticated user can delete their session
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "You can only delete sessions belonging to your own account.",
      403,
    );
  }
  const session = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: { id: props.sessionId },
  });
  if (!session) {
    throw new HttpException("Session not found.", 404);
  }
  if (session.todo_list_user_id !== props.userId) {
    throw new HttpException(
      "You are not authorized to delete this session.",
      403,
    );
  }
  await MyGlobal.prisma.todo_list_user_sessions.delete({
    where: { id: props.sessionId },
  });
}
