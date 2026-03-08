import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
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
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const completionStatusFilter = props.body.completionStatus ?? "all";
  const sortKey = props.body.sortKey ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const whereInput: Prisma.todo_app_todosWhereInput = {
    member_id: props.member.id,
    is_deleted: false,
  };
  if (completionStatusFilter === "complete") {
    whereInput.is_complete = true;
  } else if (completionStatusFilter === "incomplete") {
    whereInput.is_complete = false;
  }
  const orderByInput = (() => {
    switch (sortKey) {
      case "createdAt":
        return { created_at: sortOrder as "asc" | "desc" };
      case "startDate":
        return { start_date: sortOrder as "asc" | "desc" };
      case "dueDate":
        return { due_date: sortOrder as "asc" | "desc" };
      default:
        return { created_at: "desc" as const };
    }
  })() satisfies Prisma.todo_app_todosOrderByWithRelationInput;
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      is_complete: true,
      created_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where: whereInput,
  });
  return {
    data: data.map((todo) => ({
      id: todo.id as string & tags.Format<"uuid">,
      title: todo.title,
      description: todo.description,
      start_date: todo.start_date?.toISOString() ?? null,
      due_date: todo.due_date?.toISOString() ?? null,
      is_complete: todo.is_complete,
      created_at: todo.created_at.toISOString() as string &
        tags.Format<"date-time">,
      deleted_at: todo.deleted_at?.toISOString() ?? null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
