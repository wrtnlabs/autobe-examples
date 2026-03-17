import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoAppMemberAtSummaryTransformer } from "../transformers/MultiUserTodoAppMemberAtSummaryTransformer";
import { MultiUserTodoAppTodoTransformer } from "../transformers/MultiUserTodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoAppMemberTodosTodoIdComplete(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoAppTodo> {
  const todo =
    await MyGlobal.prisma.multi_user_todo_app_todos.findUniqueOrThrow({
      where: { id: props.todoId },
      select: {
        id: true,
        user_id: true,
        is_completed: true,
      },
    });
  if (todo.user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const toggle = !todo.is_completed;
  await MyGlobal.prisma.multi_user_todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      is_completed: toggle,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.multi_user_todo_app_todo_edit_histories.create({
    data: {
      id: v4(),
      todo_id: props.todoId,
      user_id: props.member.id,
      edited_at: toISOStringSafe(new Date()),
      old_title: null,
      new_title: null,
      old_description: null,
      new_description: null,
      old_start_date: null,
      new_start_date: null,
      old_due_date: null,
      new_due_date: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const todoWithUser =
    await MyGlobal.prisma.multi_user_todo_app_todos.findUniqueOrThrow({
      where: { id: props.todoId },
      select: {
        id: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        is_completed: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        editHistories: {
          select: {
            id: true,
            user_id: true,
            todo_id: true,
            edited_at: true,
            old_title: true,
            new_title: true,
            old_description: true,
            new_description: true,
            old_start_date: true,
            new_start_date: true,
            old_due_date: true,
            new_due_date: true,
            created_at: true,
            updated_at: true,
          },
        },
        user: MultiUserTodoAppMemberAtSummaryTransformer.select(),
      },
    });
  return await MultiUserTodoAppTodoTransformer.transform(todoWithUser);
}
