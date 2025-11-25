import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserTodoListUsersTodoListUserIdTodoListUserSessionsId(props: {
  user: UserPayload;
  todoListUserId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: {
      id: props.id,
    },
  });

  if (!existing) {
    throw new HttpException("TodoListUserSession not found", 404);
  }

  if (existing.todo_list_user_id !== props.todoListUserId) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.todo_list_user_sessions.delete({
    where: {
      id: props.id,
    },
  });
}
