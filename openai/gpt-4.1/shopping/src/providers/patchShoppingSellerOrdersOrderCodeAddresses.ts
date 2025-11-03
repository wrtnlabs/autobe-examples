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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerOrdersOrderCodeAddresses(props: {
  seller: SellerPayload;
  orderCode: string;
  body: IShoppingOrderAddress.IRequest;
}): Promise<IPageIShoppingOrderAddress.ISummary> {
  const { seller, orderCode, body } = props;

  // 1. Find the order by orderCode and check seller is associated
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: { order_code: orderCode, deleted_at: null },
    select: { id: true },
  });
  if (!order) throw new HttpException("Order not found", 404);

  // Seller can only view addresses for orders they fulfill (must have an order line on this order)
  const line = await MyGlobal.prisma.shopping_order_lines.findFirst({
    where: {
      shopping_order_id: order.id,
      shopping_seller_id: seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!line)
    throw new HttpException("Unauthorized: You do not fulfill this order", 403);

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Build where for filters
  const where: Record<string, any> = {
    shopping_order_id: order.id,
    deleted_at: null,
    ...(body.type !== undefined && body.type !== null && { type: body.type }),
    ...(body.recipient_name !== undefined &&
      body.recipient_name !== null && {
        recipient_name: { contains: body.recipient_name },
      }),
  };

  // search (full text) on recipient, base_address, city, state_province, country
  if (body.search !== undefined && body.search !== null && body.search !== "") {
    where.OR = [
      { recipient_name: { contains: body.search } },
      { base_address: { contains: body.search } },
      { city: { contains: body.search } },
      { state_province: { contains: body.search } },
      { country: { contains: body.search } },
    ];
  }

  // Fetch page and total
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_order_addresses.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_order_addresses.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((r) => ({
      id: r.id,
      shopping_order_id: r.shopping_order_id,
      type: r.type,
      recipient_name: r.recipient_name,
      recipient_phone: r.recipient_phone,
      zip_code: r.zip_code,
      base_address: r.base_address,
      detail_address: r.detail_address ?? undefined,
      city: r.city,
      state_province: r.state_province,
      country: r.country,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
    })),
  };
}
