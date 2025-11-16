import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import { IPageITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemConfig";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function patchTodoAppTodoAdminSystemConfigs(props: {
  todoAdmin: TodoadminPayload;
  body: ITodoAppSystemConfig.IRequest;
}): Promise<IPageITodoAppSystemConfig.ISummary> {
  const maxLimit = 100;
  const requestedPage = props.body.page;
  const requestedLimit = props.body.limit;

  const effectiveLimit = requestedLimit > maxLimit ? maxLimit : requestedLimit;
  const effectivePage = requestedPage < 0 ? 0 : requestedPage;
  const skip = effectivePage * effectiveLimit;

  const includeDeleted = props.body.include_deleted;
  const isActiveFilter = props.body.is_active;
  const scopeFilter = props.body.scope;
  const keyFilter = props.body.key;

  const baseWhere: Prisma.todo_app_system_configsWhereInput = {
    ...(includeDeleted ? {} : { deleted_at: null }),
    ...(typeof isActiveFilter === "boolean"
      ? { is_active: isActiveFilter }
      : {}),
    ...(scopeFilter !== null && scopeFilter !== undefined && scopeFilter !== ""
      ? { scope: scopeFilter }
      : {}),
    ...(keyFilter !== null && keyFilter !== undefined && keyFilter !== ""
      ? { key: keyFilter }
      : {}),
  };

  const orderByField = props.body.order_by;
  const orderDirectionRaw = props.body.order_direction;
  const orderDirection: Prisma.SortOrder =
    orderDirectionRaw === "desc" ? "desc" : "asc";

  const orderByList: Prisma.todo_app_system_configsOrderByWithRelationInput[] =
    [];

  if (
    orderByField === "scope" ||
    orderByField === "key" ||
    orderByField === "created_at"
  ) {
    if (orderByField === "scope") {
      orderByList.push({ scope: orderDirection });
    } else if (orderByField === "key") {
      orderByList.push({ key: orderDirection });
    } else if (orderByField === "created_at") {
      orderByList.push({ created_at: orderDirection });
    }
  }

  if (orderByList.length === 0) {
    orderByList.push({ scope: "asc" });
    orderByList.push({ key: "asc" });
  }

  const [rows, totalCount] = await Promise.all([
    MyGlobal.prisma.todo_app_system_configs.findMany({
      where: baseWhere,
      orderBy: orderByList,
      skip,
      take: effectiveLimit,
    }),
    MyGlobal.prisma.todo_app_system_configs.count({
      where: baseWhere,
    }),
  ]);

  const data = rows.map(
    (row): ITodoAppSystemConfig.ISummary => ({
      id: row.id,
      scope: row.scope,
      key: row.key,
      value: row.value,
      description: row.description === null ? null : row.description,
      is_active: row.is_active,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at === null ? null : toISOStringSafe(row.deleted_at),
    }),
  );

  const pages =
    totalCount === 0 || effectiveLimit === 0
      ? 0
      : Math.ceil(totalCount / effectiveLimit);

  const pagination: IPage.IPagination = {
    current: effectivePage satisfies number as number,
    limit: effectiveLimit satisfies number as number,
    records: totalCount,
    pages,
  };

  return {
    pagination,
    data,
  };
}
