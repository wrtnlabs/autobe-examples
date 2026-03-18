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

export async function patchTodoAppMemberTodosTrash(props: {
  member: MemberPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.todo_app_todosWhereInput = {
    todo_app_member_id: props.member.id,
    deleted_at: {
      not: null,
    },
    ...(props.body.completionStatus === "complete"
      ? { is_completed: true }
      : props.body.completionStatus === "incomplete"
        ? { is_completed: false }
        : {}),
  };
  const orderBy = (
    props.body.sort === "createdAtAsc"
      ? [
          { created_at: "asc" as const },
          { deleted_at: "asc" as const },
          { created_at: "asc" as const },
        ]
      : props.body.sort === "createdAtDesc"
        ? [
            { created_at: "desc" as const },
            { deleted_at: "desc" as const },
            { created_at: "desc" as const },
          ]
        : props.body.sort === "startAtAsc"
          ? [
              { start_at: "asc" as const },
              { deleted_at: "desc" as const },
              { created_at: "desc" as const },
            ]
          : props.body.sort === "startAtDesc"
            ? [
                { start_at: "desc" as const },
                { deleted_at: "desc" as const },
                { created_at: "desc" as const },
              ]
            : props.body.sort === "dueAtAsc"
              ? [
                  { due_at: "asc" as const },
                  { deleted_at: "desc" as const },
                  { created_at: "desc" as const },
                ]
              : props.body.sort === "dueAtDesc"
                ? [
                    { due_at: "desc" as const },
                    { deleted_at: "desc" as const },
                    { created_at: "desc" as const },
                  ]
                : [
                    { deleted_at: "desc" as const },
                    { created_at: "desc" as const },
                  ]
  ) satisfies Prisma.todo_app_todosOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      title: true,
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
  });
  const records = await MyGlobal.prisma.todo_app_todos.count({ where });
  return {
    data: data.map((todo) => ({
      id: todo.id,
      title: todo.title,
      member: {
        id: todo.member.id,
        email: todo.member.email,
        created_at: todo.member.created_at.toISOString(),
        updated_at: todo.member.updated_at.toISOString(),
        deleted_at: todo.member.deleted_at?.toISOString() ?? null,
      } satisfies ITodoAppMember.ISummary,
      is_completed: todo.is_completed,
      start_at: todo.start_at?.toISOString() ?? null,
      due_at: todo.due_at?.toISOString() ?? null,
      created_at: todo.created_at.toISOString(),
      deleted_at: todo.deleted_at?.toISOString() ?? null,
    })),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
