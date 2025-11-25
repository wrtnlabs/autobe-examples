import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserUsersUserEmailSessionsSessionId(props: {
  user: UserPayload;
  userEmail: string & tags.Format<"email">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the session exists and belongs to the specified user email
  const session = await MyGlobal.prisma.todo_app_user_sessions.findFirst({
    where: {
      id: props.sessionId,
      user: {
        email: props.userEmail,
        deleted_at: null,
      },
    },
  });

  if (!session) {
    throw new HttpException(
      "Session not found or does not belong to specified user",
      404,
    );
  }

  // Delete the session
  await MyGlobal.prisma.todo_app_user_sessions.delete({
    where: { id: props.sessionId },
  });
}
