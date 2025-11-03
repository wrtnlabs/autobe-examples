import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLine";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import { IShoppingOrderLineFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLineFulfillment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingAdminOrdersOrderCodeLines(props: {
  admin: AdminPayload;
  orderCode: string;
  body: IShoppingOrderLine.ICreate;
}): Promise<IShoppingOrderLine> {
  // 1. Retrieve parent order and validate status/editability
  const order = await MyGlobal.prisma.shopping_orders.findUnique({
    where: { order_code: props.orderCode },
  });
  if (!order || order.deleted_at !== null) {
    throw new HttpException("Order not found or has been deleted", 404);
  }
  const finalizedStatuses = ["paid", "fulfilled", "cancelled"];
  if (finalizedStatuses.includes(order.status)) {
    throw new HttpException("Cannot add line to finalized order", 400);
  }
  // 2. Retrieve SKU and validate state
  const sku = await MyGlobal.prisma.shopping_skus.findUnique({
    where: { id: props.body.shopping_sku_id },
    include: { product: true },
  });
  if (!sku || !sku.is_active || sku.deleted_at !== null) {
    throw new HttpException("SKU not found or inactive", 400);
  }
  if (!sku.product || sku.product.deleted_at !== null) {
    throw new HttpException("Associated product is not active", 400);
  }
  // 3. Prevent duplicate SKU lines for this order
  const exists = await MyGlobal.prisma.shopping_order_lines.findFirst({
    where: {
      shopping_order_id: order.id,
      shopping_sku_id: props.body.shopping_sku_id,
      deleted_at: null,
    },
  });
  if (exists) {
    throw new HttpException("Order already contains this SKU", 409);
  }
  // 4. Create new order line
  const now = toISOStringSafe(new Date());
  const newLine = await MyGlobal.prisma.shopping_order_lines.create({
    data: {
      id: v4(),
      shopping_order_id: order.id,
      shopping_sku_id: sku.id,
      shopping_seller_id: sku.product.shopping_seller_id,
      quantity: props.body.quantity,
      unit_price: props.body.unit_price,
      status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    include: {
      sku: true,
      seller: true,
    },
  });
  return {
    id: newLine.id,
    sku: {
      id: sku.id,
      sku_code: sku.sku_code,
      price: sku.price,
      is_active: sku.is_active,
      status: sku.status,
    },
    quantity: newLine.quantity,
    unit_price: newLine.unit_price,
    status: newLine.status,
    seller: {
      id: newLine.seller.id,
      display_name: newLine.seller.display_name,
      status: newLine.seller.status,
    },
    fulfillments: undefined,
    created_at: toISOStringSafe(newLine.created_at),
    updated_at: toISOStringSafe(newLine.updated_at),
    deleted_at:
      newLine.deleted_at === null
        ? undefined
        : toISOStringSafe(newLine.deleted_at),
  };
}
