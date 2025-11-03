import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdminActionLog";
import { IPageIShoppingAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAdminActionLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminAdminActionLogs(props: {
  admin: AdminPayload;
  body: IShoppingAdminActionLog.IRequest;
}): Promise<IPageIShoppingAdminActionLog.ISummary> {
  const body = props.body;

  // --- Pagination setup ---
  const page = body.page !== undefined ? body.page : 1;
  const limit = body.limit !== undefined ? Math.min(body.limit, 100) : 20;
  const skip = (page - 1) * limit;

  // --- Sort setup ---
  const allowedSort: Record<string, true> = {
    created_at: true,
    admin_id: true,
    entity_type: true,
  };
  const sortBy =
    body.sort_by && allowedSort[body.sort_by] ? body.sort_by : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // --- Build where clause ---
  const where = {
    deleted_at: null,
    ...(body.action_type !== undefined && { action_type: body.action_type }),
    ...(body.entity_type !== undefined && { entity_type: body.entity_type }),
    ...(body.entity_id !== undefined && { entity_id: body.entity_id }),
    ...(body.admin_id !== undefined && { admin_id: body.admin_id }),
    ...(body.affected_admin_id !== undefined && {
      affected_admin_id: body.affected_admin_id,
    }),
    ...(body.affected_seller_id !== undefined && {
      affected_seller_id: body.affected_seller_id,
    }),
    ...(body.affected_customer_id !== undefined && {
      affected_customer_id: body.affected_customer_id,
    }),
    ...(body.reason !== undefined &&
      body.reason.length > 0 && { reason: { contains: body.reason } }),
    // Date range: created_at
    ...(body.created_at_from !== undefined && body.created_at_to !== undefined
      ? {
          created_at: {
            gte: body.created_at_from,
            lte: body.created_at_to,
          },
        }
      : body.created_at_from !== undefined
        ? {
            created_at: { gte: body.created_at_from },
          }
        : body.created_at_to !== undefined
          ? {
              created_at: { lte: body.created_at_to },
            }
          : {}),
  };

  // --- Query DB ---
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_admin_action_logs.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_admin_action_logs.count({ where }),
  ]);

  const data: IShoppingAdminActionLog.ISummary[] = rows.map((row) => ({
    id: row.id,
    admin_id: row.admin_id,
    affected_admin_id:
      row.affected_admin_id !== null ? row.affected_admin_id : undefined,
    affected_seller_id:
      row.affected_seller_id !== null ? row.affected_seller_id : undefined,
    affected_customer_id:
      row.affected_customer_id !== null ? row.affected_customer_id : undefined,
    action_type: row.action_type,
    entity_type: row.entity_type !== null ? row.entity_type : undefined,
    entity_id: row.entity_id !== null ? row.entity_id : undefined,
    reason: row.reason !== null ? row.reason : undefined,
    created_at: toISOStringSafe(row.created_at),
    deleted_at:
      row.deleted_at !== null ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
