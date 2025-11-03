import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundAdminOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAdminOverride";
import { IPageIShoppingRefundAdminOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingRefundAdminOverride";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminRefundsRefundRequestIdOverrides(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundAdminOverride.IRequest;
}): Promise<IPageIShoppingRefundAdminOverride.ISummary> {
  const { refundRequestId, body } = props;

  // Pagination and sorting
  const page = body.page ?? 1;
  const page_size = body.page_size ?? 20;
  const skip = (page - 1) * page_size;
  const limit = page_size;

  // Allowed sort fields
  const allowedSortBy = ["created_at", "override_type"];
  const sort_by = allowedSortBy.includes(body.sort_by ?? "")
    ? body.sort_by
    : "created_at";
  const sort_order: "asc" | "desc" = body.sort_order === "asc" ? "asc" : "desc";

  // Where clause
  const where: Record<string, unknown> = {
    shopping_refund_request_id: refundRequestId,
    ...(body.override_type ? { override_type: body.override_type } : {}),
    ...(body.admin_id ? { shopping_admin_id: body.admin_id } : {}),
    ...(body.from || body.to
      ? {
          created_at: {
            ...(body.from ? { gte: body.from } : {}),
            ...(body.to ? { lte: body.to } : {}),
          },
        }
      : {}),
    ...(body.search
      ? {
          OR: [
            { reason: { contains: body.search } },
            { detailed_context: { contains: body.search } },
          ],
        }
      : {}),
  };

  // Query DB
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_refund_admin_overrides.findMany({
      where,
      orderBy:
        sort_by === "created_at"
          ? { created_at: sort_order }
          : { override_type: sort_order },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_refund_request_id: true,
        shopping_admin_id: true,
        override_type: true,
        reason: true,
        detailed_context: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_refund_admin_overrides.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    shopping_refund_request_id: row.shopping_refund_request_id,
    shopping_admin_id: row.shopping_admin_id,
    override_type: row.override_type,
    reason: row.reason,
    detailed_context: row.detailed_context ?? undefined,
    created_at: toISOStringSafe(row.created_at),
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
