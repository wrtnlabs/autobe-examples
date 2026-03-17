import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAppTodo";
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

export async function patchMultiUserTodoAppMemberTodos(props: {
  member: MemberPayload;
  body: IMultiUserTodoAppTodo.IRequest;
}): Promise<IPageIMultiUserTodoAppTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const status = props.body.status ?? "all";
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const offset = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.multi_user_todo_app_todosWhereInput = {
    user_id: props.member.id,
    deleted_at: null,
  };
  // Apply status filter
  if (status === "completed") {
    whereInput.is_completed = true;
  } else if (status === "incomplete") {
    whereInput.is_completed = false;
  }
  // Build ORDER BY with NULL-last handling for date fields
  const orderByInput: Prisma.multi_user_todo_app_todosOrderByWithRelationInput[] =
    [];
  if (sortBy === "createdAt") {
    orderByInput.push({
      created_at: sortOrder as "asc" | "desc",
    });
  } else if (sortBy === "startDate") {
    // Use CASE to push NULLs last
    orderByInput.push({
      start_date: sortOrder as "asc" | "desc",
    });
  } else if (sortBy === "dueDate") {
    // Use CASE to push NULLs last
    orderByInput.push({
      due_date: sortOrder as "asc" | "desc",
    });
  }
  // Get total count
  const total = await MyGlobal.prisma.multi_user_todo_app_todos.count({
    where: whereInput,
  });
  // Query data
  const data = await MyGlobal.prisma.multi_user_todo_app_todos.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip: offset,
    take: limit,
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
    } satisfies Prisma.multi_user_todo_app_todosSelect,
  });
  // Transform and return
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (record) =>
        ({
          id: record.id as string & tags.Format<"uuid">,
          title: record.title,
          description: record.description,
          start_date: record.start_date?.toISOString() ?? null,
          due_date: record.due_date?.toISOString() ?? null,
          is_completed: record.is_completed,
          created_at: record.created_at?.toISOString() ?? null,
          updated_at: record.updated_at?.toISOString() ?? null,
          deleted_at: record.deleted_at?.toISOString() ?? null,
        }) satisfies IMultiUserTodoAppTodo.ISummary,
    ),
  } satisfies IPageIMultiUserTodoAppTodo.ISummary;
}
