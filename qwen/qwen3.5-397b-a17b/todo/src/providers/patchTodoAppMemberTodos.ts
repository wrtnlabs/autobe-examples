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
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    todo_app_member_id: props.member.id,
    deleted_at: null,
    ...(props.body.completed === "complete" && { completed: true }),
    ...(props.body.completed === "incomplete" && { completed: false }),
  } satisfies Prisma.todo_app_todosWhereInput;
  const orderByInput = (
    props.body.sort === "started_at"
      ? {
          started_at:
            props.body.order === "desc" ? ("desc" as const) : ("asc" as const),
        }
      : props.body.sort === "due_at"
        ? {
            due_at:
              props.body.order === "desc"
                ? ("desc" as const)
                : ("asc" as const),
          }
        : {
            created_at:
              props.body.order === "desc"
                ? ("desc" as const)
                : ("asc" as const),
          }
  ) satisfies Prisma.todo_app_todosOrderByWithRelationInput;
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      title: true,
      completed: true,
      started_at: true,
      due_at: true,
      created_at: true,
      member: {
        select: {
          id: true,
          display_name: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((todo) => ({
      id: todo.id,
      title: todo.title,
      completed: todo.completed,
      started_at:
        todo.started_at === null ? null : toISOStringSafe(todo.started_at),
      due_at: todo.due_at === null ? null : toISOStringSafe(todo.due_at),
      created_at: toISOStringSafe(todo.created_at),
      member: {
        id: todo.member.id,
        display_name: todo.member.display_name,
      } satisfies ITodoAppMember.ISummary,
    })),
  } satisfies IPageITodoAppTodo.ISummary;
}
