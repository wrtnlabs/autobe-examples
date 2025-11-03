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

export async function putShoppingAdminOrdersOrderCodeLinesOrderLineId(props: {
  admin: AdminPayload;
  orderCode: string;
  orderLineId: string & tags.Format<"uuid">;
  body: IShoppingOrderLine.IUpdate;
}): Promise<IShoppingOrderLine> {
  // 1. Fetch order by orderCode
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: props.orderCode,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (!order) throw new HttpException("Order not found", 404);
  if (["paid", "fulfilled", "canceled", "completed"].includes(order.status))
    throw new HttpException("Order is finalized and cannot be edited", 409);

  // 2. Fetch order line by orderLineId and order.id
  const orderLine = await MyGlobal.prisma.shopping_order_lines.findFirst({
    where: {
      id: props.orderLineId,
      shopping_order_id: order.id,
      deleted_at: null,
    },
  });
  if (!orderLine) throw new HttpException("Order line not found", 404);

  // 3. Prepare update fields
  const updateFields: Record<string, unknown> = {};
  if (typeof props.body.shopping_sku_id !== "undefined") {
    // Validate that given SKU exists and is active
    const sku = await MyGlobal.prisma.shopping_skus.findFirst({
      where: {
        id: props.body.shopping_sku_id,
        is_active: true,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_product_id: true,
      },
    });
    if (!sku) throw new HttpException("SKU does not exist or is inactive", 400);
    // Lookup product to find seller
    const product = await MyGlobal.prisma.shopping_products.findFirst({
      where: { id: sku.shopping_product_id },
      select: { shopping_seller_id: true },
    });
    if (!product) throw new HttpException("Product for SKU not found", 500);
    updateFields.shopping_sku_id = props.body.shopping_sku_id;
    updateFields.shopping_seller_id = product.shopping_seller_id;
  }
  if (typeof props.body.quantity !== "undefined") {
    updateFields.quantity = props.body.quantity;
  }
  if (typeof props.body.unit_price !== "undefined") {
    updateFields.unit_price = props.body.unit_price;
  }
  // Always update updated_at
  updateFields.updated_at = toISOStringSafe(new Date());

  // 4. Update the order line
  const updated = await MyGlobal.prisma.shopping_order_lines.update({
    where: { id: props.orderLineId },
    data: updateFields,
  });
  // 5. Fetch SKU summary
  const skuRow = await MyGlobal.prisma.shopping_skus.findFirst({
    where: { id: updated.shopping_sku_id },
    select: {
      id: true,
      sku_code: true,
      price: true,
      is_active: true,
      status: true,
      shopping_product_id: true,
    },
  });
  if (!skuRow) throw new HttpException("SKU not found after update", 500);
  // 6. Get seller id from product
  const productRow = await MyGlobal.prisma.shopping_products.findFirst({
    where: { id: skuRow.shopping_product_id },
    select: { shopping_seller_id: true },
  });
  if (!productRow)
    throw new HttpException("Product for SKU not found after update", 500);
  // 7. Fetch seller summary
  const seller = await MyGlobal.prisma.shopping_sellers.findFirst({
    where: { id: productRow.shopping_seller_id },
    select: { id: true, display_name: true, status: true },
  });
  if (!seller) throw new HttpException("Seller not found after update", 500);
  // 8. Fetch fulfillments (optional)
  const fulfillments =
    await MyGlobal.prisma.shopping_order_fulfillments.findMany({
      where: { shopping_order_line_id: updated.id },
      select: {
        id: true,
        fulfillment_code: true,
        quantity_fulfilled: true,
        status: true,
        fulfilled_at: true,
        shopping_seller_address_id: true,
      },
      orderBy: { fulfilled_at: "asc" },
    });
  // 9. Compose response
  return {
    id: updated.id,
    sku: {
      id: skuRow.id,
      sku_code: skuRow.sku_code,
      price: skuRow.price,
      is_active: skuRow.is_active,
      status: skuRow.status,
    },
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    status: updated.status,
    seller: {
      id: seller.id,
      display_name: seller.display_name,
      status: seller.status,
    },
    fulfillments:
      fulfillments.length > 0
        ? fulfillments.map((f) => ({
            id: f.id,
            fulfillment_code: f.fulfillment_code,
            quantity_fulfilled: f.quantity_fulfilled,
            status: f.status,
            fulfilled_at: toISOStringSafe(f.fulfilled_at),
            seller_address_id: f.shopping_seller_address_id,
          }))
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "object" && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : typeof updated.deleted_at === "string"
          ? updated.deleted_at
          : undefined,
  };
}
