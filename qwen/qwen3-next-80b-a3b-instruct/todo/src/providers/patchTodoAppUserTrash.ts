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
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTrash(props: {
  user: UserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  // Operation specification defines defaults
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Build where clause with soft-deleted filter and user ownership
  const where: Prisma.todo_app_todosWhereInput = {
    todo_app_user_id: props.user.id,
    deleted_at: { not: null },
  };
  // Use default sort as specified in operation spec
  const orderBy: Prisma.todo_app_todosOrderByWithRelationInput = {
    created_at: "desc",
  };
  // Fetch paginated data
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      title: true,
      completed: true,
      start_date: true,
      due_date: true,
      created_at: true,
    },
  });
  // Count total records for pagination
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where,
  });
  // Transform to summary format with proper date string formatting
  const summaryData = data.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    title: record.title,
    completed: record.completed,
    start_date: record.start_date ? toISOStringSafe(record.start_date) : null,
    due_date: record.due_date ? toISOStringSafe(record.due_date) : null,
    created_at: toISOStringSafe(record.created_at),
  }));
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
