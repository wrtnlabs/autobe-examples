import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { IPageITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSetting";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchTodoAppAdminUserSystemSettings(props: {
  adminUser: AdminuserPayload;
  body: ITodoAppSystemSetting.IRequest;
}): Promise<IPageITodoAppSystemSetting.ISummary> {
  const body = props.body;

  // Pagination with sensible defaults and upper bounds
  const maxPageSize = 100;

  const rawPage = body.page === undefined ? 1 : body.page;
  const rawPageSize = body.pageSize === undefined ? 50 : body.pageSize;

  const page = rawPage < 1 ? 1 : rawPage;
  const pageSize =
    rawPageSize < 1 ? 1 : rawPageSize > maxPageSize ? maxPageSize : rawPageSize;

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // Base where: exclude soft-deleted settings
  const whereBase: Prisma.todo_app_system_settingsWhereInput = {
    deleted_at: null,
  };

  // Key filter (partial match when non-empty string provided)
  const whereKey: Prisma.todo_app_system_settingsWhereInput =
    body.key !== undefined && body.key !== ""
      ? { key: { contains: body.key } }
      : {};

  // Group filter (exact match when non-empty string provided)
  const whereGroup: Prisma.todo_app_system_settingsWhereInput =
    body.group !== undefined && body.group !== "" ? { group: body.group } : {};

  // Enabled tri-state filter
  const whereEnabled: Prisma.todo_app_system_settingsWhereInput =
    body.enabled !== undefined && body.enabled !== null
      ? { enabled: body.enabled }
      : {};

  // Created_at range filter
  let whereCreatedAt: Prisma.todo_app_system_settingsWhereInput = {};
  if (body.createdFrom !== undefined || body.createdTo !== undefined) {
    const createdRange: { gte?: string; lte?: string } = {};
    if (body.createdFrom !== undefined) createdRange.gte = body.createdFrom;
    if (body.createdTo !== undefined) createdRange.lte = body.createdTo;
    whereCreatedAt = { created_at: createdRange };
  }

  // Updated_at range filter
  let whereUpdatedAt: Prisma.todo_app_system_settingsWhereInput = {};
  if (body.updatedFrom !== undefined || body.updatedTo !== undefined) {
    const updatedRange: { gte?: string; lte?: string } = {};
    if (body.updatedFrom !== undefined) updatedRange.gte = body.updatedFrom;
    if (body.updatedTo !== undefined) updatedRange.lte = body.updatedTo;
    whereUpdatedAt = { updated_at: updatedRange };
  }

  const where: Prisma.todo_app_system_settingsWhereInput = {
    ...whereBase,
    ...whereKey,
    ...whereGroup,
    ...whereEnabled,
    ...whereCreatedAt,
    ...whereUpdatedAt,
  };

  // Sorting: whitelist allowed fields, default to updated_at desc
  const sortBy = body.sortBy === undefined ? "updated_at" : body.sortBy;
  const sortDirection =
    body.sortDirection === undefined ? "desc" : body.sortDirection;

  const direction: Prisma.SortOrder = sortDirection === "asc" ? "asc" : "desc";

  let orderBy: Prisma.todo_app_system_settingsOrderByWithRelationInput;
  if (
    sortBy === "key" ||
    sortBy === "group" ||
    sortBy === "enabled" ||
    sortBy === "created_at" ||
    sortBy === "updated_at"
  ) {
    orderBy = { [sortBy]: direction };
  } else {
    // Fallback ordering when unsupported sort field requested
    orderBy = { updated_at: "desc" };
  }

  const [rows, totalCount] = await Promise.all([
    MyGlobal.prisma.todo_app_system_settings.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.todo_app_system_settings.count({
      where,
    }),
  ]);

  const data: ITodoAppSystemSetting.ISummary[] = rows.map((row) => {
    const summary: ITodoAppSystemSetting.ISummary = {
      id: row.id,
      key: row.key,
      value: row.value,
      type: row.type,
      enabled: row.enabled,
    };

    // Optional nullable metadata fields
    if (row.description !== null) {
      summary.description = row.description;
    } else {
      summary.description = null;
    }

    if (row.group !== null) {
      summary.group = row.group;
    } else {
      summary.group = null;
    }

    return summary;
  });

  const pagination: IPage.IPagination = {
    current: page,
    limit: pageSize,
    records: totalCount,
    pages: pageSize === 0 ? 0 : Math.ceil(totalCount / pageSize),
  };

  return {
    pagination,
    data,
  };
}
