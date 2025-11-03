import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserUsersMeSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, sessionId } = props;

  const session = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.todo_list_user_id !== user.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own sessions",
      403,
    );
  }

  if (session.expired_at !== null) {
    throw new HttpException("Session is already expired", 400);
  }

  await MyGlobal.prisma.todo_list_user_sessions.update({
    where: { id: sessionId },
    data: {
      expired_at: toISOStringSafe(new Date()),
    },
  });
}
