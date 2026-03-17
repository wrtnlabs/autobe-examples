import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteMultiUserTodoMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string;
}): Promise<void> {
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      member_id: true,
      deleted_at: true,
    },
  });
  if (todo.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (todo.deleted_at !== null) {
    throw new HttpException(
      "Operation cannot be performed: todo is already in trash",
      409,
    );
  }
  await MyGlobal.prisma.multi_user_todo_todos.update({
    where: { id: props.todoId },
    data: {
      deleted_at: new Date().toISOString(),
    },
  });
}
