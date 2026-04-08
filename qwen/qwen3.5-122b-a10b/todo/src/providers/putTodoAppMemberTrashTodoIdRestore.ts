import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppMemberTrashTodoIdRestore(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
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
    throw new HttpException("Todo is not deleted", 400);
  }
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      deleted_at: null,
      updated_at: new Date(),
    },
  });
  const restored = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(restored);
}
