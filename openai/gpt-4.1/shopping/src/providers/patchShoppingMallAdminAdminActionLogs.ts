import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionLog";
import { IPageIShoppingMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminActionLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAdminActionLogs(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminActionLog.IRequest;
}): Promise<IPageIShoppingMallAdminActionLog.ISummary> {
  const {
    admin_id,
    action_type,
    from,
    to,
    search,
    sort_by,
    sort_dir,
    page,
    limit,
  } = props.body;

  // Pagination defaults
  const pageNum = page ?? 1;
  const perPage = limit ?? 20;
  const skip = (pageNum - 1) * perPage;

  // Sorting defaults and constraints
  const allowedSortBy = ["created_at", "action_type"];
  const sortField = allowedSortBy.includes(sort_by ?? "")
    ? sort_by!
    : "created_at";
  const sortDirection = sort_dir === "asc" ? "asc" : "desc";

  // Search - matches action_type or context_info (case-insensitive, substring)
  const buildWhere = () => {
    const where: Record<string, any> = {};
    if (admin_id !== undefined) where.shopping_mall_admin_id = admin_id;
    if (action_type !== undefined) where.action_type = action_type;
    if (from !== undefined || to !== undefined) {
      where.created_at = {};
      if (from !== undefined) (where.created_at as any).gte = from;
      if (to !== undefined) (where.created_at as any).lt = to;
    }
    if (search !== undefined && search.length > 0) {
      where.OR = [
        { action_type: { contains: search, mode: "insensitive" } },
        { context_info: { contains: search, mode: "insensitive" } },
      ];
    }
    return where;
  };

  const where = buildWhere();

  // Query logs and count
  const [logs, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admin_action_logs.findMany({
      where,
      orderBy: { [sortField]: sortDirection },
      skip,
      take: perPage,
    }),
    MyGlobal.prisma.shopping_mall_admin_action_logs.count({
      where,
    }),
  ]);

  // Map DB rows to summary with type-safe conversions
  const data = logs.map((log) => ({
    id: log.id,
    shopping_mall_admin_id: log.shopping_mall_admin_id,
    action_type: log.action_type,
    context_info: log.context_info === null ? null : log.context_info,
    created_at: toISOStringSafe(log.created_at),
  }));

  return {
    pagination: {
      current: pageNum,
      limit: perPage,
      records: total,
      pages: Math.ceil(total / perPage),
    },
    data,
  };
}
