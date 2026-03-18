import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
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

export async function patchTodoAppMemberTodosTodoIdHistories(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoHistory.IRequest;
}): Promise<IPageITodoAppTodoHistory.ISummary> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_app_member_id: true,
    },
  });
  if (todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.pageSize ?? props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const whereInput = {
    todo_app_todo_id: props.todoId,
  } satisfies Prisma.todo_app_todo_historiesWhereInput;
  const histories = await MyGlobal.prisma.todo_app_todo_histories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { edited_at: "desc" },
    select: {
      id: true,
      edited_at: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      todo: {
        select: {
          id: true,
          title: true,
          todo_app_member_id: true,
          is_completed: true,
          start_at: true,
          due_at: true,
          created_at: true,
          deleted_at: true,
          member: {
            select: {
              id: true,
              email: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
    },
  });
  const records = await MyGlobal.prisma.todo_app_todo_histories.count({
    where: whereInput,
  });
  return {
    data: histories.map((history) => ({
      id: history.id,
      editedAt: history.edited_at.toISOString(),
      title: history.title,
      description: history.description,
      startAt: history.start_date?.toISOString() ?? null,
      dueAt: history.due_date?.toISOString() ?? null,
      todo: {
        id: history.todo.id,
        title: history.todo.title,
        member: {
          id: history.todo.member.id,
          email: history.todo.member.email,
          created_at: history.todo.member.created_at.toISOString(),
          updated_at: history.todo.member.updated_at.toISOString(),
          deleted_at: history.todo.member.deleted_at?.toISOString() ?? null,
        },
        is_completed: history.todo.is_completed,
        start_at: history.todo.start_at?.toISOString() ?? null,
        due_at: history.todo.due_at?.toISOString() ?? null,
        created_at: history.todo.created_at.toISOString(),
        deleted_at: history.todo.deleted_at?.toISOString() ?? null,
      },
    })),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
