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
import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { IPageITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { TodoListAdminAtSummaryTransformer } from "../transformers/TodoListAdminAtSummaryTransformer";

export async function patchTodoListAdminAdmins(props: {
  admin: AdminPayload;
  body: ITodoListAdmin.IRequest;
}): Promise<IPageITodoListAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build dynamic where conditions
  const whereInput = {
    deleted_at: null,
    ...(props.body.username && {
      username: { contains: props.body.username, mode: "insensitive" },
    }),
    ...(props.body.emailDomain && {
      email: { endsWith: props.body.emailDomain },
    }),
    ...(props.body.registeredFrom && {
      created_at: { gte: props.body.registeredFrom },
    }),
    ...(props.body.registeredTo && {
      created_at: { lte: props.body.registeredTo },
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
  } satisfies Prisma.todo_list_adminWhereInput;
  // Build orderBy input with const assertions
  const orderByInput = (
    props.body.sortBy === "email"
      ? { email: props.body.order === "desc" ? "desc" : "asc" }
      : { created_at: props.body.order === "desc" ? "desc" : "asc" }
  ) satisfies Prisma.todo_list_adminOrderByWithRelationInput;
  // Query data with transformer's select and dynamic where/orderBy
  const data = await MyGlobal.prisma.todo_list_admin.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...TodoListAdminAtSummaryTransformer.select(),
  });
  // Count total records with same where conditions
  const total = await MyGlobal.prisma.todo_list_admin.count({
    where: whereInput,
  });
  // Transform array with asyncMap and transformer
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoListAdminAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
