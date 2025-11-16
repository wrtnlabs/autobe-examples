import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import { IPageIShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDispute";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminDisputes(props: {
  admin: AdminPayload;
  body: IShoppingMallDispute.IRequest;
}): Promise<IPageIShoppingMallDispute.ISummary> {
  const {
    status,
    customer_id,
    seller_id,
    admin_id,
    refund_request_id,
    subject,
    root_cause,
    created_from,
    created_to,
    order_by,
    order,
    page = 1,
    limit = 100,
  } = props.body;

  // Build where clause for Prisma
  const where: Record<string, unknown> = {
    ...(status && { status }),
    ...(customer_id && { shopping_mall_customer_id: customer_id }),
    ...(seller_id && { shopping_mall_seller_id: seller_id }),
    ...(admin_id && { shopping_mall_admin_id: admin_id }),
    ...(refund_request_id && {
      shopping_mall_refund_request_id: refund_request_id,
    }),
    ...(subject && { subject: { contains: subject } }),
    ...(root_cause && { root_cause: { contains: root_cause } }),
    ...(created_from &&
      created_to && { created_at: { gte: created_from, lte: created_to } }),
    ...(created_from && !created_to && { created_at: { gte: created_from } }),
    ...(!created_from && created_to && { created_at: { lte: created_to } }),
  };

  // Sorting
  const orderField = order_by ?? "created_at";
  const orderDir = order ?? "desc";
  // Pagination
  const skip = (page - 1) * limit;

  // Query disputes and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_disputes.findMany({
      where,
      include: {
        customer: true,
        seller: true,
        admin: true,
      },
      orderBy: { [orderField]: orderDir },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_disputes.count({ where }),
  ]);

  const data: IShoppingMallDispute.ISummary[] = rows.map((row) => ({
    id: row.id,
    status: row.status,
    subject: row.subject,
    root_cause: row.root_cause,
    resolution_note:
      typeof row.resolution_note === "undefined"
        ? undefined
        : row.resolution_note === null
          ? null
          : row.resolution_note,
    customer: { id: row.customer.id, name: row.customer.name },
    seller: { id: row.seller.id, business_name: row.seller.business_name },
    admin:
      typeof row.admin === "undefined"
        ? undefined
        : row.admin === null
          ? null
          : {
              id: row.admin.id,
              name: row.admin.name,
              email: row.admin.email,
            },
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      typeof row.deleted_at === "undefined"
        ? undefined
        : row.deleted_at === null
          ? null
          : toISOStringSafe(row.deleted_at),
  }));

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
