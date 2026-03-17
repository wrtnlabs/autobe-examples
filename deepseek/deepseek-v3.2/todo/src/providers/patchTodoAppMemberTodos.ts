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
import { TodoAppTodoAtSummaryTransformer } from "../transformers/TodoAppTodoAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodos(props: {
  member: MemberPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  // Extract pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with member ownership as base
  const whereInput: Prisma.todo_app_todosWhereInput = {
    todo_app_member_id: props.member.id,
  };
  // Apply text search filter
  if (props.body.search) {
    whereInput.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Apply completion status filter
  if (props.body.completed !== undefined) {
    whereInput.completed = props.body.completed;
  }
  // Apply date range filters
  if (props.body.start_date_range) {
    whereInput.start_date = {
      gte: props.body.start_date_range.start,
      lte: props.body.start_date_range.end,
    };
  }
  if (props.body.due_date_range) {
    whereInput.due_date = {
      gte: props.body.due_date_range.start,
      lte: props.body.due_date_range.end,
    };
  }
  if (props.body.created_at_range) {
    whereInput.created_at = {
      gte: props.body.created_at_range.start,
      lte: props.body.created_at_range.end,
    };
  }
  // Determine sorting
  const sortBy = props.body.sort_by ?? "due_date";
  const sortOrder =
    props.body.sort_order ?? (sortBy === "title" ? "asc" : "desc");
  // Build orderBy safely
  let orderByInput: Prisma.todo_app_todosOrderByWithRelationInput;
  if (sortBy === "due_date") {
    orderByInput = { due_date: sortOrder };
  } else if (sortBy === "start_date") {
    orderByInput = { start_date: sortOrder };
  } else if (sortBy === "created_at") {
    orderByInput = { created_at: sortOrder };
  } else {
    orderByInput = { title: sortOrder };
  }
  // Execute queries sequentially
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...TodoAppTodoAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where: whereInput,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    TodoAppTodoAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
