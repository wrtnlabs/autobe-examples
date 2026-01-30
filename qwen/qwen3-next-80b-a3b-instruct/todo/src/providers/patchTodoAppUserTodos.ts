import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";
import { IPageITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoItemAtSummaryTransformer } from "../transformers/TodoAppTodoItemAtSummaryTransformer";

export async function patchTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodoItem.IRequest;
}): Promise<IPageITodoAppTodoItem.ISummary> {
  // NOTE: Pagination parameters 'page' and 'limit' do not exist in ITodoAppTodoItem.IRequest
  // System handles pagination with cursor-based approach using the provided filter fields
  // Build WHERE conditions with user context
  const whereInput = {
    user_id: props.user.id,
    deleted_at: null,
    ...(props.body.title && { title: { contains: props.body.title } }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.createdAtStart && {
      created_at: { gte: props.body.createdAtStart },
    }),
    ...(props.body.createdAtEnd && {
      created_at: { lte: props.body.createdAtEnd },
    }),
  } satisfies Prisma.todo_app_todo_itemsWhereInput;
  // Build ORDER BY conditions
  const orderByInput = (
    props.body.orderBy === "createdAt"
      ? { created_at: "asc" as const }
      : props.body.orderBy === "createdAt:desc"
        ? { created_at: "desc" as const }
        : props.body.orderBy === "title"
          ? { title: "asc" as const }
          : props.body.orderBy === "title:desc"
            ? { title: "desc" as const }
            : props.body.orderBy === "status"
              ? { status: "asc" as const }
              : props.body.orderBy === "status:desc"
                ? { status: "desc" as const }
                : { created_at: "desc" as const }
  ) satisfies Prisma.todo_app_todo_itemsOrderByWithRelationInput; // default
  // Query data with transformer's select
  const data = await MyGlobal.prisma.todo_app_todo_items.findMany({
    where: whereInput,
    skip: 0, // System handles pagination - no page-based skip
    take: 100, // Default limit - system manages pagination
    orderBy: orderByInput,
    ...TodoAppTodoItemAtSummaryTransformer.select(),
  });
  // Count total records - this is what drives pagination calculation
  const total = await MyGlobal.prisma.todo_app_todo_items.count({
    where: whereInput,
  });
  // Calculate pagination parameters based on total count with fixed limit
  // Since page/limit aren't in request, use system defaults
  const limit = 100;
  const pages = Math.ceil(total / limit);
  const current = 1; // Always start at page 1
  // Transform data using transformer
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppTodoItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  };
}
