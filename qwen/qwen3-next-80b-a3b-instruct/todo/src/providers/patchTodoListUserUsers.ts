import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoListUserAtSummaryTransformer } from "../transformers/TodoListUserAtSummaryTransformer";

export async function patchTodoListUserUsers(props: {
  user: UserPayload;
  body: ITodoListUser.IRequest;
}): Promise<IPageITodoListUser.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions from IRequest using actual schema field names
  // Database schema has email, created_at, is_active, status - no name or username field
  const whereInput: Prisma.todo_list_userWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [{ email: { contains: props.body.search, mode: "insensitive" } }],
    }),
    ...(props.body.emailDomain && {
      email: { endsWith: props.body.emailDomain },
    }),
    ...(props.body.createdAtFrom && {
      created_at: { gte: toISOStringSafe(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo && {
      created_at: { lte: toISOStringSafe(props.body.createdAtTo) },
    }),
    ...(props.body.lastLoginFrom && {
      last_login: { gte: toISOStringSafe(props.body.lastLoginFrom) },
    }),
    ...(props.body.lastLoginTo && {
      last_login: { lte: toISOStringSafe(props.body.lastLoginTo) },
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.isActive !== undefined && {
      is_active: props.body.isActive,
    }),
  } satisfies Prisma.todo_list_userWhereInput;
  // Build ORDER BY conditions using only valid field names from schema
  // Valid sort fields based on database schema: email, created_at, last_login
  const sortField =
    props.body.sortby === "email"
      ? "email"
      : props.body.sortby === "createdAt"
        ? "created_at"
        : props.body.sortby === "lastLogin"
          ? "last_login"
          : "created_at";
  const orderByInput = {
    [sortField]: props.body.order === "desc" ? "desc" : "asc",
  } satisfies Prisma.todo_list_userOrderByWithRelationInput;
  // Fetch data with transformer's select
  const data = await MyGlobal.prisma.todo_list_user.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...TodoListUserAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.todo_list_user.count({
    where: whereInput,
  });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    TodoListUserAtSummaryTransformer.transform,
  );
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
