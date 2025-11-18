import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import { IPageITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListSystemConfig";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminSystemConfigs(props: {
  admin: AdminPayload;
  body: ITodoListSystemConfig.IRequest;
}): Promise<IPageITodoListSystemConfig.ISummary> {
  const {
    key,
    value,
    created_from,
    created_to,
    updated_from,
    updated_to,
    include_deleted,
    page,
    limit,
    sort_by,
    order,
  } = props.body || {};

  const effectivePage = page ?? 1;
  const effectiveLimit = limit ?? 20;
  const take = Math.min(effectiveLimit, 100);
  const skip = (effectivePage - 1) * take;

  let createdAtFilter: Record<string, unknown> | undefined = undefined;
  if (
    created_from !== undefined &&
    created_from !== null &&
    created_to !== undefined &&
    created_to !== null
  ) {
    createdAtFilter = { gte: created_from, lte: created_to };
  } else if (created_from !== undefined && created_from !== null) {
    createdAtFilter = { gte: created_from };
  } else if (created_to !== undefined && created_to !== null) {
    createdAtFilter = { lte: created_to };
  }

  let updatedAtFilter: Record<string, unknown> | undefined = undefined;
  if (
    updated_from !== undefined &&
    updated_from !== null &&
    updated_to !== undefined &&
    updated_to !== null
  ) {
    updatedAtFilter = { gte: updated_from, lte: updated_to };
  } else if (updated_from !== undefined && updated_from !== null) {
    updatedAtFilter = { gte: updated_from };
  } else if (updated_to !== undefined && updated_to !== null) {
    updatedAtFilter = { lte: updated_to };
  }

  const where = {
    ...(key !== undefined && key !== null ? { key: { contains: key } } : {}),
    ...(value !== undefined && value !== null
      ? { value: { contains: value } }
      : {}),
    ...(createdAtFilter ? { created_at: createdAtFilter } : {}),
    ...(updatedAtFilter ? { updated_at: updatedAtFilter } : {}),
    ...(include_deleted ? {} : { deleted_at: null }),
  };

  const orderField = sort_by ?? "created_at";
  const orderDirection = order ?? "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_list_system_configs.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip,
      take,
    }),
    MyGlobal.prisma.todo_list_system_configs.count({ where }),
  ]);

  return {
    pagination: {
      current: effectivePage,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    },
    data: rows.map((row) => ({
      key: row.key,
      value: row.value,
      description: row.description === null ? null : row.description,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at === null ? null : toISOStringSafe(row.deleted_at),
    })),
  };
}
