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

export async function postShoppingCustomerOrdersOrderCodeLines(props: {
  customer: CustomerPayload;
  orderCode: string;
  body: IShoppingOrderLine.ICreate;
}): Promise<IShoppingOrderLine> {
  const { customer, orderCode, body } = props;

  // 1. Find and verify order, must be editable, owned by customer, not deleted
  const order = await MyGlobal.prisma.shopping_orders.findUnique({
    where: { order_code: orderCode },
  });
  if (
    !order ||
    order.deleted_at !== null ||
    order.shopping_customer_id !== customer.id
  ) {
    throw new HttpException("Order not found or not accessible", 404);
  }
  if (order.status !== "pending" && order.status !== "in_progress") {
    throw new HttpException("Order is not editable (finalized or paid)", 400);
  }

  // 2. Find and verify SKU
  const sku = await MyGlobal.prisma.shopping_skus.findUnique({
    where: { id: body.shopping_sku_id },
  });
  if (
    !sku ||
    sku.deleted_at !== null ||
    !sku.is_active ||
    sku.status !== "in_stock"
  ) {
    throw new HttpException("SKU is not available for order", 400);
  }

  // 2b. Fetch parent product to retrieve seller_id
  const product = await MyGlobal.prisma.shopping_products.findUnique({
    where: { id: sku.shopping_product_id },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found or deleted", 400);
  }
  const sellerId = product.shopping_seller_id;

  // 3. Prevent duplicate SKU in order
  const duplicate = await MyGlobal.prisma.shopping_order_lines.findFirst({
    where: {
      shopping_order_id: order.id,
      shopping_sku_id: sku.id,
      deleted_at: null,
    },
  });
  if (duplicate) {
    throw new HttpException("SKU already exists in this order", 409);
  }

  // 4. Quantity check
  if (body.quantity < 1) {
    throw new HttpException("Quantity must be at least 1", 400);
  }
  // Check inventory exists and is enough
  const inventory = await MyGlobal.prisma.shopping_inventory.findUnique({
    where: { shopping_sku_id: sku.id },
  });
  if (!inventory || inventory.deleted_at !== null) {
    throw new HttpException(
      "Inventory record missing or SKU discontinued",
      400,
    );
  }
  if (inventory.quantity < body.quantity) {
    throw new HttpException("Insufficient stock for requested quantity", 409);
  }

  // 5. Get seller info
  const seller = await MyGlobal.prisma.shopping_sellers.findUnique({
    where: { id: sellerId },
  });
  if (!seller || seller.deleted_at !== null) {
    throw new HttpException("Seller not found or deleted", 400);
  }

  // 6. Create order line
  const now = toISOStringSafe(new Date());
  const createdLine = await MyGlobal.prisma.shopping_order_lines.create({
    data: {
      id: v4(),
      shopping_order_id: order.id,
      shopping_sku_id: sku.id,
      shopping_seller_id: sellerId,
      quantity: body.quantity,
      unit_price: body.unit_price,
      status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: createdLine.id,
    sku: {
      id: sku.id,
      sku_code: sku.sku_code,
      price: sku.price,
      is_active: sku.is_active,
      status: sku.status,
    },
    quantity: createdLine.quantity,
    unit_price: createdLine.unit_price,
    status: createdLine.status,
    seller: {
      id: seller.id,
      display_name: seller.display_name,
      status: seller.status,
    },
    fulfillments: [],
    created_at: toISOStringSafe(createdLine.created_at),
    updated_at: toISOStringSafe(createdLine.updated_at),
    deleted_at:
      createdLine.deleted_at != null
        ? toISOStringSafe(createdLine.deleted_at)
        : undefined,
  };
}
