import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodos(props: {
  member: MemberPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const currentPage: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (currentPage - 1) * limit;
  const where: Prisma.todo_app_todosWhereInput = {
    todo_app_member_id: props.member.id,
    deleted_at: null,
    ...(props.body.completionStatus === "complete"
      ? { is_completed: true }
      : props.body.completionStatus === "incomplete"
        ? { is_completed: false }
        : {}),
  };
  const orderBy: Prisma.todo_app_todosOrderByWithRelationInput[] =
    props.body.sort === "createdAtAsc"
      ? [{ created_at: "asc" }, { id: "asc" }]
      : props.body.sort === "startAtAsc"
        ? [{ start_at: "asc" }, { id: "asc" }]
        : props.body.sort === "startAtDesc"
          ? [{ start_at: "desc" }, { id: "desc" }]
          : props.body.sort === "dueAtAsc"
            ? [{ due_at: "asc" }, { id: "asc" }]
            : props.body.sort === "dueAtDesc"
              ? [{ due_at: "desc" }, { id: "desc" }]
              : [{ created_at: "desc" }, { id: "desc" }];
  const todos = await MyGlobal.prisma.todo_app_todos.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      title: true,
      member: {
        select: {
          id: true,
          email: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      is_completed: true,
      start_at: true,
      due_at: true,
      created_at: true,
    },
  });
  const records: number = await MyGlobal.prisma.todo_app_todos.count({
    where,
  });
  return {
    data: todos.map(
      (todo): ITodoAppTodo.ISummary => ({
        id: todo.id,
        title: todo.title,
        member: {
          id: todo.member.id,
          email: todo.member.email,
          created_at: toISOStringSafe(todo.member.created_at),
          updated_at: toISOStringSafe(todo.member.updated_at),
          deleted_at:
            todo.member.deleted_at === null
              ? null
              : toISOStringSafe(todo.member.deleted_at),
        },
        is_completed: todo.is_completed,
        start_at:
          todo.start_at === null ? null : toISOStringSafe(todo.start_at),
        due_at: todo.due_at === null ? null : toISOStringSafe(todo.due_at),
        created_at: toISOStringSafe(todo.created_at),
        deleted_at: null,
      }),
    ),
    pagination: {
      current: currentPage,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
