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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getPrivateTodoAppMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<IPrivateTodoAppTodo> {
  const todo = await MyGlobal.prisma.private_todo_app_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
      user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      completed: true,
      member: {
        select: {
          id: true,
          display_name: true,
        },
      },
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description,
    start_date: todo.start_date?.toISOString() ?? null,
    due_date: todo.due_date?.toISOString() ?? null,
    completed: todo.completed,
    member: {
      id: todo.member.id,
      displayName: todo.member.display_name,
    } satisfies IPrivateTodoAppMember.ISummary,
    created_at: todo.created_at.toISOString(),
    updated_at: todo.updated_at.toISOString(),
    deleted_at: todo.deleted_at?.toISOString() ?? null,
  } satisfies IPrivateTodoAppTodo;
}
