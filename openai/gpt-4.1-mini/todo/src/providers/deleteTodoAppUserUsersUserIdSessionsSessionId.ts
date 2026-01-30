import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session = await MyGlobal.prisma.todo_app_user_sessions.findUnique({
    where: {
      id: props.sessionId,
    },
    select: {
      id: true,
      todo_app_user_id: true,
    },
  });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  if (session.todo_app_user_id !== props.userId) {
    throw new HttpException(
      "Forbidden - You can only delete your own sessions",
      403,
    );
  }
  await MyGlobal.prisma.todo_app_user_sessions.delete({
    where: { id: props.sessionId },
  });
}
