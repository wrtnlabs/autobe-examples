import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrderFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderFulfillment";
import { IPageIShoppingOrderFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderFulfillment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerOrdersOrderCodeFulfillments(props: {
  seller: SellerPayload;
  orderCode: string;
  body: IShoppingOrderFulfillment.IRequest;
}): Promise<IPageIShoppingOrderFulfillment> {
  const { seller, orderCode, body } = props;

  // Find the target order (must exist, not deleted)
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: orderCode,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Find all order lines in the order that belong to the seller
  const orderLines = await MyGlobal.prisma.shopping_order_lines.findMany({
    where: {
      shopping_order_id: order.id,
      shopping_seller_id: seller.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (orderLines.length === 0) {
    throw new HttpException(
      "Forbidden: You do not have fulfillments for this order",
      403,
    );
  }

  const orderLineIds = orderLines.map((line) => line.id);

  // Prepare filter for fulfillments
  const where = {
    shopping_order_line_id: { in: orderLineIds },
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.from !== undefined &&
      body.from !== null && { fulfilled_at: { gte: body.from } }),
    ...(body.to !== undefined &&
      body.to !== null && { fulfilled_at: { lte: body.to } }),
  };

  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  const [fulfillments, total] = await Promise.all([
    MyGlobal.prisma.shopping_order_fulfillments.findMany({
      where,
      orderBy: { fulfilled_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_order_fulfillments.count({
      where,
    }),
  ]);

  const data = fulfillments.map((f) => ({
    id: f.id,
    shopping_order_line_id: f.shopping_order_line_id,
    shopping_seller_id: f.shopping_seller_id,
    shopping_seller_address_id: f.shopping_seller_address_id,
    fulfillment_code: f.fulfillment_code,
    quantity_fulfilled: f.quantity_fulfilled,
    fulfilled_at: toISOStringSafe(f.fulfilled_at),
    status: f.status,
    note: f.note === null || typeof f.note === "string" ? f.note : undefined,
    created_at: toISOStringSafe(f.created_at),
    updated_at: toISOStringSafe(f.updated_at),
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
