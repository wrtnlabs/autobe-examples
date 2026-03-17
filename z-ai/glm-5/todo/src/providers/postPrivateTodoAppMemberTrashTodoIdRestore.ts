import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PrivateTodoAppTodoTransformer } from "../transformers/PrivateTodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postPrivateTodoAppMemberTrashTodoIdRestore(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<IPrivateTodoAppTodo> {
  const todo = await MyGlobal.prisma.private_todo_app_todos.findUnique({
    where: { id: props.todoId },
    select: {
      id: true,
      user_id: true,
      deleted_at: true,
    },
  });
  if (todo === null) {
    throw new HttpException("Todo not found", 404);
  }
  if (todo.user_id !== props.member.id) {
    throw new HttpException("Access denied", 403);
  }
  if (todo.deleted_at === null) {
    throw new HttpException("Todo is not in trash", 400);
  }
  const restored = await MyGlobal.prisma.private_todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      deleted_at: null,
      updated_at: new Date(),
    },
    ...PrivateTodoAppTodoTransformer.select(),
  });
  return await PrivateTodoAppTodoTransformer.transform(restored);
}
