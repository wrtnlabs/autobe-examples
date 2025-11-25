import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderNumberItemsOrderItemId(props: {
  admin: AdminPayload;
  orderNumber: string;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  // 1. Find shopping_mall_orders by orderNumber (unique)
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { order_number: props.orderNumber, deleted_at: null },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }

  // 2. Find the order item (must belong to this order and not deleted already)
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      shopping_mall_order_id: order.id,
      deleted_at: null,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }

  // 3. Soft delete the order item
  const deletedAt = toISOStringSafe(new Date());
  const updatedItem = await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.orderItemId },
    data: { deleted_at: deletedAt },
  });

  // 4. Fetch product, SKU, and order summary info
  const [product, sku, orderFull] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.findUnique({
      where: { id: updatedItem.shopping_mall_product_id },
    }),
    MyGlobal.prisma.shopping_mall_product_skus.findUnique({
      where: { id: updatedItem.shopping_mall_product_sku_id },
    }),
    MyGlobal.prisma.shopping_mall_orders.findUnique({
      where: { id: updatedItem.shopping_mall_order_id },
    }),
  ]);
  if (product === null || sku === null || orderFull === null) {
    throw new HttpException("Order/product/SKU not found", 500);
  }

  // Fetch seller for product summary
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: product.shopping_mall_seller_id },
  });
  const productCategories: IShoppingMallProductsCategory.ISummary[] = [];
  // Build order summary
  const orderSummary = {
    id: orderFull.id,
    order_number: orderFull.order_number,
    status: orderFull.status,
    total_amount: orderFull.total_amount,
    currency: orderFull.currency,
    created_at: toISOStringSafe(orderFull.created_at),
    updated_at: toISOStringSafe(orderFull.updated_at),
    deleted_at: orderFull.deleted_at
      ? toISOStringSafe(orderFull.deleted_at)
      : undefined,
  };
  // Build product summary
  const productSummary = {
    id: product.id,
    title: product.title,
    default_price: product.default_price,
    business_status: product.business_status,
    seller: seller
      ? { id: seller.id, business_name: seller.business_name }
      : { id: product.shopping_mall_seller_id, business_name: "" },
    categories: productCategories,
    created_at: toISOStringSafe(product.created_at),
  };
  // Build SKU summary
  const skuSummary = {
    id: sku.id,
    code: sku.sku_code,
    product_title: product.title,
    option_summary: "",
    in_stock: sku.stock > 0 && sku.status === "active",
  };
  // 5. Return final IShoppingMallOrderItem DTO
  return {
    id: updatedItem.id,
    order: orderSummary,
    product: productSummary,
    sku: skuSummary,
    quantity: updatedItem.quantity,
    unit_price: updatedItem.unit_price,
    subtotal: updatedItem.subtotal,
    currency: updatedItem.currency,
    delivered: updatedItem.delivered,
    refunded: updatedItem.refunded,
    created_at: toISOStringSafe(updatedItem.created_at),
    updated_at: toISOStringSafe(updatedItem.updated_at),
    deleted_at: updatedItem.deleted_at
      ? toISOStringSafe(updatedItem.deleted_at)
      : undefined,
  };
}
