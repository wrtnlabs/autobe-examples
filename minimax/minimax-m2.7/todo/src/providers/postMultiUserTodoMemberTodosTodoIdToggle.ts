import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoTransformer } from "../transformers/MultiUserTodoTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoMemberTodosTodoIdToggle(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodo> {
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      multi_user_todo_member_id: true,
      completed: true,
      deleted_at: true,
    },
  });
  if (todo.deleted_at !== null) {
    throw new HttpException("Cannot toggle a deleted todo", 400);
  }
  if (todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.multi_user_todo_todos.update({
    where: { id: props.todoId },
    data: {
      completed: !todo.completed,
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow(
    {
      where: { id: props.todoId },
      ...MultiUserTodoTodoTransformer.select(),
    },
  );
  return await MultiUserTodoTodoTransformer.transform(updated);
}
