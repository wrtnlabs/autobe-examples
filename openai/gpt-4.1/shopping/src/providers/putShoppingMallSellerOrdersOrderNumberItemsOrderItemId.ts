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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerOrdersOrderNumberItemsOrderItemId(props: {
  seller: SellerPayload;
  orderNumber: string;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  // 1. Locate the parent order for the correct seller
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Order not found or access denied.", 404);
  }
  // 2. Find the child order item under this order
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      shopping_mall_order_id: order.id,
      deleted_at: null,
    },
  });
  if (!orderItem) {
    throw new HttpException(
      "Order item not found or not part of this order.",
      404,
    );
  }
  // 3. Prepare Prisma update data immutably
  const now = toISOStringSafe(new Date());
  const updateData = {
    ...(props.body.quantity !== undefined && { quantity: props.body.quantity }),
    ...(props.body.unit_price !== undefined && {
      unit_price: props.body.unit_price,
    }),
    ...(props.body.delivered !== undefined && {
      delivered: props.body.delivered,
    }),
    ...(props.body.refunded !== undefined && { refunded: props.body.refunded }),
    updated_at: now,
  };
  const updated = await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: orderItem.id },
    data: updateData,
  });
  // 4. Concurrently load related entities for summary refs
  const [product, sku, seller] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.findUnique({
      where: { id: updated.shopping_mall_product_id },
    }),
    MyGlobal.prisma.shopping_mall_product_skus.findUnique({
      where: { id: updated.shopping_mall_product_sku_id },
    }),
    MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: order.shopping_mall_seller_id },
    }),
  ]);
  if (!product || !sku || !seller) {
    throw new HttpException("Related product, seller, or SKU not found.", 500);
  }
  // Populate order, product, sku summary objects per IShoppingMallOrderItem spec
  return {
    id: updated.id,
    order: {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      currency: order.currency,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      deleted_at:
        order.deleted_at === null
          ? undefined
          : toISOStringSafe(order.deleted_at),
    },
    product: {
      id: product.id,
      title: product.title,
      default_price: product.default_price,
      business_status: product.business_status,
      seller: {
        id: seller.id,
        business_name: seller.business_name,
      },
      categories: [], // Categories would be loaded from related table if desired
      created_at: toISOStringSafe(product.created_at),
    },
    sku: {
      id: sku.id,
      code: sku.sku_code,
      product_title: product.title,
      option_summary: "", // For brevity; would retrieve option data if desired
      in_stock: sku.stock > 0,
    },
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    subtotal: updated.subtotal,
    currency: updated.currency,
    delivered: updated.delivered,
    refunded: updated.refunded,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
