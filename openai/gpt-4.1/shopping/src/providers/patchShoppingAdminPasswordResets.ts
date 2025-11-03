import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPasswordReset";
import { IPageIShoppingPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingPasswordReset";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminPasswordResets(props: {
  admin: AdminPayload;
  body: IShoppingPasswordReset.IRequest;
}): Promise<IPageIShoppingPasswordReset.ISummary> {
  const {
    page = 1,
    limit = 20,
    search,
    actor_type,
    status,
    created_from,
    created_to,
    expires_from,
    expires_to,
    sort_by = "created_at",
    sort_order = "desc",
    consumed,
    email,
  } = props.body;
  // Calculate skip/take for pagination
  const skip = (page - 1) * limit;
  // Current time for status logic
  const now = toISOStringSafe(new Date());
  // Build dynamic WHERE object (no intermediate typing, only object literal inference)
  const where = {
    ...(search && {
      OR: [
        {
          request_email: {
            contains: search,
          },
        },
      ],
    }),
    ...(email && { request_email: email }),
    ...(actor_type === "customer" && { shopping_customer_id: { not: null } }),
    ...(actor_type === "seller" && { shopping_seller_id: { not: null } }),
    ...(actor_type === "admin" && { shopping_admin_id: { not: null } }),
    ...((created_from || created_to) && {
      created_at: {
        ...(created_from && { gte: created_from }),
        ...(created_to && { lte: created_to }),
      },
    }),
    ...((expires_from || expires_to) && {
      expires_at: {
        ...(expires_from && { gte: expires_from }),
        ...(expires_to && { lte: expires_to }),
      },
    }),
    ...(typeof consumed === "boolean" && {
      consumed_at: consumed ? { not: null } : null,
    }),
    ...(status === "pending" && {
      consumed_at: null,
      expires_at: { gte: now },
    }),
    ...(status === "used" && {
      consumed_at: { not: null },
    }),
    ...(status === "expired" && {
      consumed_at: null,
      expires_at: { lt: now },
    }),
  };
  // Validate sort field (only created_at or expires_at allowed)
  const actualSortField =
    sort_by === "expires_at" ? "expires_at" : "created_at";
  const actualSortOrder = sort_order === "asc" ? "asc" : "desc";
  // Query and count total separately for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_password_resets.findMany({
      where,
      orderBy: {
        [actualSortField]: actualSortOrder,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_password_resets.count({ where }),
  ]);
  // Map DB model to ISummary
  const data = rows.map((row) => {
    const summary: IShoppingPasswordReset.ISummary = {
      id: row.id,
      shopping_customer_id: row.shopping_customer_id ?? undefined,
      shopping_seller_id: row.shopping_seller_id ?? undefined,
      shopping_admin_id: row.shopping_admin_id ?? undefined,
      request_email: row.request_email,
      expires_at: toISOStringSafe(row.expires_at),
      consumed_at: row.consumed_at
        ? toISOStringSafe(row.consumed_at)
        : undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    };
    return summary;
  });
  // Build pagination result
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
