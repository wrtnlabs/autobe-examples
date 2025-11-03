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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingCustomerOrdersOrderCodeLinesOrderLineId(props: {
  customer: CustomerPayload;
  orderCode: string;
  orderLineId: string & tags.Format<"uuid">;
  body: IShoppingOrderLine.IUpdate;
}): Promise<IShoppingOrderLine> {
  // Step 1: Fetch order, check not deleted/owned
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: props.orderCode,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: Order does not belong to this customer",
      403,
    );
  }
  if (
    ["paid", "fulfilled", "canceled", "completed"].indexOf(order.status) !== -1
  ) {
    throw new HttpException(
      "Order is already finalized and cannot be modified",
      400,
    );
  }

  // Step 2: Fetch order line, ensure belongs to order and is not deleted
  const orderLine = await MyGlobal.prisma.shopping_order_lines.findFirst({
    where: {
      id: props.orderLineId,
      shopping_order_id: order.id,
      deleted_at: null,
    },
  });
  if (!orderLine) {
    throw new HttpException("Order line not found", 404);
  }

  // Step 3: Determine new SKU (if being changed), and validate existence/active
  let nextSkuId = orderLine.shopping_sku_id;
  if (props.body.shopping_sku_id !== undefined) {
    const newSku = await MyGlobal.prisma.shopping_skus.findFirst({
      where: {
        id: props.body.shopping_sku_id,
        is_active: true,
        deleted_at: null,
      },
    });
    if (!newSku) {
      throw new HttpException("SKU not found or not active", 404);
    }
    nextSkuId = newSku.id;
  }

  // Step 4: If quantity given, validate against inventory for new SKU
  if (props.body.quantity !== undefined && props.body.quantity > 0) {
    const inventory = await MyGlobal.prisma.shopping_inventory.findFirst({
      where: { shopping_sku_id: nextSkuId, deleted_at: null },
    });
    if (!inventory || inventory.quantity < props.body.quantity) {
      throw new HttpException(
        "Requested quantity exceeds available inventory",
        400,
      );
    }
  }

  // Step 5: Update the order line
  const now = toISOStringSafe(new Date());
  const updatedLine = await MyGlobal.prisma.shopping_order_lines.update({
    where: { id: orderLine.id },
    data: {
      shopping_sku_id: props.body.shopping_sku_id ?? undefined,
      quantity: props.body.quantity ?? undefined,
      unit_price: props.body.unit_price ?? undefined,
      updated_at: now,
    },
  });

  // Step 6: Resolve nested fields for API DTO
  // 1. Fetch SKU
  const sku = await MyGlobal.prisma.shopping_skus.findFirst({
    where: { id: updatedLine.shopping_sku_id },
  });
  if (!sku) {
    throw new HttpException("SKU not found after update", 500);
  }
  // 2. Fetch product and seller
  const product = await MyGlobal.prisma.shopping_products.findFirst({
    where: { id: sku.shopping_product_id },
  });
  if (!product) {
    throw new HttpException("Product not found for SKU", 500);
  }
  const seller = await MyGlobal.prisma.shopping_sellers.findFirst({
    where: { id: product.shopping_seller_id, deleted_at: null },
  });
  if (!seller) {
    throw new HttpException("Seller not found for product", 500);
  }

  // Fulfillments
  const fulfillments =
    await MyGlobal.prisma.shopping_order_fulfillments.findMany({
      where: { shopping_order_line_id: updatedLine.id },
    });

  return {
    id: updatedLine.id,
    sku: {
      id: sku.id,
      sku_code: sku.sku_code,
      price: sku.price,
      is_active: sku.is_active,
      status: sku.status,
    },
    quantity: updatedLine.quantity,
    unit_price: updatedLine.unit_price,
    status: updatedLine.status,
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
    created_at: toISOStringSafe(updatedLine.created_at),
    updated_at: now,
    deleted_at: updatedLine.deleted_at
      ? toISOStringSafe(updatedLine.deleted_at)
      : undefined,
  };
}
