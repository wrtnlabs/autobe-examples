import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderAddress";
import { IPageIShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderAddress";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerOrdersOrderCodeAddresses(props: {
  customer: CustomerPayload;
  orderCode: string;
  body: IShoppingOrderAddress.IRequest;
}): Promise<IPageIShoppingOrderAddress.ISummary> {
  const { customer, orderCode, body } = props;

  // 1. Find the order by code
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: orderCode,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_customer_id: true,
    },
  });
  if (!order) throw new HttpException("Order not found", 404);
  // 2. Authorization: only owner may see
  if (order.shopping_customer_id !== customer.id) {
    throw new HttpException("Forbidden: not your order", 403);
  }
  // 3. Prepare where clause
  const baseWhere: Record<string, unknown> = {
    shopping_order_id: order.id,
  };
  if (body.type !== null && body.type !== undefined) {
    baseWhere.type = body.type;
  }
  if (body.recipient_name !== null && body.recipient_name !== undefined) {
    baseWhere.recipient_name = body.recipient_name;
  }
  if (body.search !== null && body.search !== undefined) {
    // Only do full text search on allowed fields: recipient_name, zip_code, base_address, city, state_province, country
    baseWhere.OR = [
      { recipient_name: { contains: body.search } },
      { zip_code: { contains: body.search } },
      { base_address: { contains: body.search } },
      { city: { contains: body.search } },
      { state_province: { contains: body.search } },
      { country: { contains: body.search } },
    ];
  }
  // Pagination
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // 4. Query data & count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_order_addresses.findMany({
      where: baseWhere,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_order_addresses.count({ where: baseWhere }),
  ]);

  // 5. Map to ISummary
  const data = rows.map((row) => ({
    id: row.id,
    shopping_order_id: row.shopping_order_id,
    type: row.type,
    recipient_name: row.recipient_name,
    recipient_phone: row.recipient_phone,
    zip_code: row.zip_code,
    base_address: row.base_address,
    detail_address: row.detail_address ?? undefined,
    city: row.city,
    state_province: row.state_province,
    country: row.country,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
