import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminRefundRequests(props: {
  admin: AdminPayload;
  body: IShoppingMallRefundRequest.IRequest;
}): Promise<IPageIShoppingMallRefundRequest.ISummary> {
  const {
    status,
    customer_id,
    seller_id,
    admin_id,
    order_id,
    reason,
    created_from,
    created_to,
    updated_from,
    updated_to,
    requested_amount_min,
    requested_amount_max,
    approved_amount_min,
    approved_amount_max,
    page = 1,
    limit = 100,
    sort_by = "created_at",
    sort_order = "desc",
  } = props.body;

  const where = {
    ...(status !== undefined ? { status } : {}),
    ...(customer_id !== undefined
      ? { shopping_mall_customer_id: customer_id }
      : {}),
    ...(seller_id !== undefined ? { shopping_mall_seller_id: seller_id } : {}),
    ...(admin_id !== undefined ? { shopping_mall_admin_id: admin_id } : {}),
    ...(order_id !== undefined ? { shopping_mall_order_id: order_id } : {}),
    ...(reason !== undefined ? { reason: { contains: reason } } : {}),
    ...(created_from !== undefined || created_to !== undefined
      ? {
          created_at: {
            ...(created_from !== undefined ? { gte: created_from } : {}),
            ...(created_to !== undefined ? { lte: created_to } : {}),
          },
        }
      : {}),
    ...(updated_from !== undefined || updated_to !== undefined
      ? {
          updated_at: {
            ...(updated_from !== undefined ? { gte: updated_from } : {}),
            ...(updated_to !== undefined ? { lte: updated_to } : {}),
          },
        }
      : {}),
    ...(requested_amount_min !== undefined || requested_amount_max !== undefined
      ? {
          requested_amount: {
            ...(requested_amount_min !== undefined
              ? { gte: requested_amount_min }
              : {}),
            ...(requested_amount_max !== undefined
              ? { lte: requested_amount_max }
              : {}),
          },
        }
      : {}),
    ...(approved_amount_min !== undefined || approved_amount_max !== undefined
      ? {
          approved_amount: {
            ...(approved_amount_min !== undefined
              ? { gte: approved_amount_min }
              : {}),
            ...(approved_amount_max !== undefined
              ? { lte: approved_amount_max }
              : {}),
          },
        }
      : {}),
  };

  const effectiveLimit = limit ?? 100;
  const effectivePage = page ?? 1;
  const skip = (effectivePage - 1) * effectiveLimit;
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "status",
    "requested_amount",
    "approved_amount",
  ];
  const sortField = allowedSortFields.includes(sort_by || "")
    ? sort_by
    : "created_at";
  const sortDirection = sort_order === "asc" ? "asc" : "desc";

  const [refunds, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_refund_requests.findMany({
      where,
      include: {
        order: true,
        customer: true,
        seller: true,
      },
      skip,
      take: effectiveLimit,
      orderBy: { [sortField]: sortDirection },
    }),
    MyGlobal.prisma.shopping_mall_refund_requests.count({
      where,
    }),
  ]);

  const data = refunds.map((row) => {
    const refundDeletedAt =
      row.deleted_at !== null ? toISOStringSafe(row.deleted_at) : null;
    const orderDeletedAt =
      row.order.deleted_at !== null
        ? toISOStringSafe(row.order.deleted_at)
        : null;
    const approvedAmountField = Object.prototype.hasOwnProperty.call(
      row,
      "approved_amount",
    )
      ? row.approved_amount === null
        ? null
        : row.approved_amount
      : undefined;
    return {
      id: row.id,
      order: {
        id: row.order.id,
        order_number: row.order.order_number,
        status: row.order.status,
        total_amount: row.order.total_amount,
        currency: row.order.currency,
        created_at: toISOStringSafe(row.order.created_at),
        updated_at: toISOStringSafe(row.order.updated_at),
        deleted_at: orderDeletedAt,
      },
      customer: {
        id: row.customer.id,
        name: row.customer.name,
      },
      seller: {
        id: row.seller.id,
        business_name: row.seller.business_name,
      },
      status: row.status,
      reason: row.reason,
      requested_amount: row.requested_amount,
      ...(approvedAmountField !== undefined
        ? { approved_amount: approvedAmountField }
        : {}),
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: refundDeletedAt,
    };
  });

  return {
    pagination: {
      current: effectivePage satisfies number as number,
      limit: effectiveLimit satisfies number as number,
      records: total,
      pages: Math.ceil(total / effectiveLimit),
    },
    data,
  };
}
