import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IPageIShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPayment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminPayments(props: {
  admin: AdminPayload;
  body: IShoppingMallPayment.IRequest;
}): Promise<IPageIShoppingMallPayment.ISummary> {
  const body = props.body;
  // Pagination: required in DTO
  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  // Filter construction
  const where: Record<string, any> = { deleted_at: null };
  if (body.status != null) where.status = body.status;
  if (body.method_type != null) where.method_type = body.method_type;
  if (body.currency != null) where.currency = body.currency;
  if (body.customer_id != null) where.customer_id = body.customer_id;
  if (body.provider_id != null) where.provider_id = body.provider_id;
  if (body.external_payment_id != null)
    where.external_payment_id = body.external_payment_id;
  if (body.transaction_token != null)
    where.transaction_token = body.transaction_token;
  if (body.min_amount != null || body.max_amount != null) {
    where.amount = {};
    if (body.min_amount != null) where.amount.gte = body.min_amount;
    if (body.max_amount != null) where.amount.lte = body.max_amount;
  }
  if (body.requested_from != null || body.requested_to != null) {
    where.requested_at = {};
    if (body.requested_from != null)
      where.requested_at.gte = new Date(body.requested_from);
    if (body.requested_to != null)
      where.requested_at.lte = new Date(body.requested_to);
  }
  if (body.processed_from != null || body.processed_to != null) {
    where.processed_at = {};
    if (body.processed_from != null)
      where.processed_at.gte = new Date(body.processed_from);
    if (body.processed_to != null)
      where.processed_at.lte = new Date(body.processed_to);
  }

  // Sorting
  let orderBy: Record<string, "asc" | "desc">;
  if (body.order_by != null) {
    orderBy = { [body.order_by]: body.order_dir === "asc" ? "asc" : "desc" };
  } else {
    orderBy = { requested_at: "desc" };
  }

  // Data fetch and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_payments.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        method_type: true,
        amount: true,
        currency: true,
        status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_payments.count({ where }),
  ]);

  // Map to ISummary DTO type
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      method: row.method_type,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
