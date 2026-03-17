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

export async function postPrivateTodoAppMemberTodosTodoIdToggle(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<IPrivateTodoAppTodo> {
  // Query todo to verify ownership and get current completed value
  const todo = await MyGlobal.prisma.private_todo_app_todos.findUnique({
    where: { id: props.todoId },
    select: { id: true, user_id: true, completed: true },
  });
  // If todo doesn't exist, throw 404
  if (todo === null) {
    throw new HttpException("Todo not found", 404);
  }
  // If todo belongs to another member, throw 403
  if (todo.user_id !== props.member.id) {
    throw new HttpException("Access denied", 403);
  }
  // Toggle completion status and update timestamp
  const updated = await MyGlobal.prisma.private_todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      completed: !todo.completed,
      updated_at: new Date(),
    },
    ...PrivateTodoAppTodoTransformer.select(),
  });
  return await PrivateTodoAppTodoTransformer.transform(updated);
}
