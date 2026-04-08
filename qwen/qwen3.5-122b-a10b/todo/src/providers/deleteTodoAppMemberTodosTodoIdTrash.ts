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

export async function deleteTodoAppMemberTodosTodoIdTrash(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_app_member_id: true,
      deleted_at: true,
    },
  });
  if (todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (todo.deleted_at === null) {
    throw new HttpException("Todo is not in trash", 404);
  }
  await MyGlobal.prisma.todo_app_todos.delete({
    where: { id: props.todoId },
  });
}
