import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAdminSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdminSuspension";
import { IPageIShoppingAdminSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAdminSuspension";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminAdminSuspensions(props: {
  admin: AdminPayload;
  body: IShoppingAdminSuspension.IRequest;
}): Promise<IPageIShoppingAdminSuspension.ISummary> {
  const page = Number(props.body.page);
  const limit = Number(props.body.limit);
  const skip = (page - 1) * limit;
  const {
    suspension_type,
    status,
    start_at_from,
    start_at_to,
    admin_id,
    affected_admin_id,
    affected_seller_id,
    affected_customer_id,
    sort_by,
    sort_order,
  } = props.body;

  // Build where conditions with correct handling for null and undefined
  const where = {
    deleted_at: null,
    ...(suspension_type !== undefined &&
      suspension_type !== null && {
        suspension_type: suspension_type,
      }),
    ...(status !== undefined &&
      status !== null && {
        status: status,
      }),
    ...(admin_id !== undefined &&
      admin_id !== null && {
        admin_id: admin_id,
      }),
    ...(affected_admin_id !== undefined &&
      affected_admin_id !== null && {
        suspended_admin_id: affected_admin_id,
      }),
    ...(affected_seller_id !== undefined &&
      affected_seller_id !== null && {
        suspended_seller_id: affected_seller_id,
      }),
    ...(affected_customer_id !== undefined &&
      affected_customer_id !== null && {
        suspended_customer_id: affected_customer_id,
      }),
    ...((start_at_from !== undefined && start_at_from !== null) ||
    (start_at_to !== undefined && start_at_to !== null)
      ? {
          start_at: {
            ...(start_at_from !== undefined &&
              start_at_from !== null && { gte: start_at_from }),
            ...(start_at_to !== undefined &&
              start_at_to !== null && { lte: start_at_to }),
          },
        }
      : {}),
  };

  // Sort field and order handling (default to created_at desc)
  const sortField = sort_by ?? "created_at";
  const sortOrder = sort_order === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_admin_suspensions.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_admin_suspensions.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    admin_id: row.admin_id,
    suspension_type: row.suspension_type,
    reason: row.reason,
    start_at: toISOStringSafe(row.start_at),
    end_at: row.end_at ? toISOStringSafe(row.end_at) : undefined,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    suspended_admin_id: row.suspended_admin_id ?? undefined,
    suspended_seller_id: row.suspended_seller_id ?? undefined,
    suspended_customer_id: row.suspended_customer_id ?? undefined,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
