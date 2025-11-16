import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrdersOrderNumberItemsOrderItemId(props: {
  customer: CustomerPayload;
  orderNumber: string;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  // Find the parent order by order number
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: { order_number: props.orderNumber, deleted_at: null },
  });
  if (!order) throw new HttpException("Order not found", 404);

  // Only owner may view
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Find the order item only in this order
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      shopping_mall_order_id: order.id,
      deleted_at: null,
    },
  });
  if (!orderItem) throw new HttpException("Order item not found", 404);

  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: orderItem.shopping_mall_product_id },
  });
  if (!product) throw new HttpException("Product not found", 404);

  // Get product's seller
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: product.shopping_mall_seller_id },
  });
  if (!seller) throw new HttpException("Seller not found", 404);

  // Get product categories (many-to-many, join through products_categories -> category)
  const productCategories =
    await MyGlobal.prisma.shopping_mall_products_categories.findMany({
      where: { shopping_mall_product_id: product.id },
      include: { category: true },
    });
  const categories = productCategories.map((pc) => ({
    id: pc.category.id,
    name: pc.category.name,
  }));

  const productSummary = {
    id: product.id,
    title: product.title,
    default_price: product.default_price,
    business_status: product.business_status,
    seller: {
      id: seller.id,
      business_name: seller.business_name,
    },
    categories,
    created_at: toISOStringSafe(product.created_at),
  };

  // Get the SKU belonging to this order item
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: orderItem.shopping_mall_product_sku_id },
  });
  if (!sku) throw new HttpException("SKU not found", 404);
  const skuSummary = {
    id: sku.id,
    code: sku.sku_code,
    product_title: product.title,
    option_summary: "",
    in_stock: sku.stock > 0 && sku.status === "active",
  };

  const orderSummary = {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    total_amount: order.total_amount,
    currency: order.currency,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at: order.deleted_at
      ? toISOStringSafe(order.deleted_at)
      : undefined,
  };

  return {
    id: orderItem.id,
    order: orderSummary,
    product: productSummary,
    sku: skuSummary,
    quantity: orderItem.quantity,
    unit_price: orderItem.unit_price,
    subtotal: orderItem.subtotal,
    currency: orderItem.currency,
    delivered: orderItem.delivered,
    refunded: orderItem.refunded,
    created_at: toISOStringSafe(orderItem.created_at),
    updated_at: toISOStringSafe(orderItem.updated_at),
    deleted_at:
      orderItem.deleted_at !== null && orderItem.deleted_at !== undefined
        ? toISOStringSafe(orderItem.deleted_at)
        : undefined,
  };
}
