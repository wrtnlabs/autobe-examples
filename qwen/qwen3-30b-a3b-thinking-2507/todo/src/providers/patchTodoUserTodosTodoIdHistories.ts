import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoHistory";
import { ITodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoUserTodosTodoIdHistories(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoHistory.IRequest;
}): Promise<IPageITodoHistory.ISummary> {
  const {
    page = 1,
    limit = 100,
    from_date,
    to_date,
    prev_title,
    new_title,
    prev_description,
    new_description,
    prev_start_date,
    new_start_date,
    prev_due_date,
    new_due_date,
  } = props.body;
  // Validate page and limit
  if (page < 1) throw new HttpException("Page must be at least 1", 400);
  if (limit < 1 || limit > 100)
    throw new HttpException("Limit must be between 1 and 100", 400);
  // Check if user owns the todo - using findFirst instead of findUnique
  const todo = await MyGlobal.prisma.todo_todos.findFirst({
    where: {
      id: props.todoId,
      user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found or not owned by user", 404);
  }
  // Build filter conditions
  const whereConditions: Prisma.todo_historiesWhereInput[] = [];
  if (from_date) whereConditions.push({ created_at: { gte: from_date } });
  if (to_date) whereConditions.push({ created_at: { lte: to_date } });
  if (prev_title)
    whereConditions.push({ prev_title: { contains: prev_title } });
  if (new_title) whereConditions.push({ new_title: { contains: new_title } });
  if (prev_description)
    whereConditions.push({ prev_description: { contains: prev_description } });
  if (new_description)
    whereConditions.push({ new_description: { contains: new_description } });
  // Fix: Date fields require comparison operators, not .contains
  if (prev_start_date)
    whereConditions.push({ prev_start_date: { gte: prev_start_date } });
  if (new_start_date)
    whereConditions.push({ new_start_date: { gte: new_start_date } });
  if (prev_due_date)
    whereConditions.push({ prev_due_date: { gte: prev_due_date } });
  if (new_due_date)
    whereConditions.push({ new_due_date: { gte: new_due_date } });
  const whereInput: Prisma.todo_historiesWhereInput =
    whereConditions.length > 0 ? { AND: whereConditions } : {};
  // Get the history records
  const data = await MyGlobal.prisma.todo_histories.findMany({
    where: {
      ...whereInput,
      todo_id: props.todoId,
    },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  // Get total count
  const total = await MyGlobal.prisma.todo_histories.count({
    where: {
      ...whereInput,
      todo_id: props.todoId,
    },
  });
  // Transform to desired format with ISO string conversion
  const transformedData = data.map((history) => ({
    id: history.id,
    created_at: toISOStringSafe(history.created_at),
    updated_at: history.updated_at
      ? toISOStringSafe(history.updated_at)
      : undefined,
    prev_title: history.prev_title,
    new_title: history.new_title,
    prev_description: history.prev_description,
    new_description: history.new_description,
    prev_start_date: history.prev_start_date
      ? toISOStringSafe(history.prev_start_date)
      : undefined,
    new_start_date: history.new_start_date
      ? toISOStringSafe(history.new_start_date)
      : undefined,
    prev_due_date: history.prev_due_date
      ? toISOStringSafe(history.prev_due_date)
      : undefined,
    new_due_date: history.new_due_date
      ? toISOStringSafe(history.new_due_date)
      : undefined,
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
