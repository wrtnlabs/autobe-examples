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

export async function deleteShoppingMallSellerOrdersOrderNumberItemsOrderItemId(props: {
  seller: SellerPayload;
  orderNumber: string;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  // 1. Load parent order and validate ownership
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Order not found or forbidden.", 404);
  }

  // 2. Load order item and validate association
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      shopping_mall_order_id: order.id,
      deleted_at: null,
    },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found or already deleted.", 404);
  }

  // 3. Soft delete the order item and update updated_at timestamp
  const updatedOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.update({
      where: { id: props.orderItemId },
      data: {
        deleted_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
      include: {
        product: true,
        sku: true,
        order: true,
      },
    });

  // 4. Load referenced seller
  const product = updatedOrderItem.product;
  const productSku = updatedOrderItem.sku;
  const parentOrder = updatedOrderItem.order;
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: {
      id: product.shopping_mall_seller_id,
    },
  });
  if (!seller) {
    throw new HttpException("Product seller not found.", 500);
  }

  // 5. Hydrate DTO objects
  return {
    id: updatedOrderItem.id,
    order: {
      id: parentOrder.id,
      order_number: parentOrder.order_number,
      status: parentOrder.status,
      total_amount: parentOrder.total_amount,
      currency: parentOrder.currency,
      created_at: toISOStringSafe(parentOrder.created_at),
      updated_at: toISOStringSafe(parentOrder.updated_at),
      deleted_at: parentOrder.deleted_at
        ? toISOStringSafe(parentOrder.deleted_at)
        : null,
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
      categories: [], // Category hydration requires additional joins not present, so leave empty
      created_at: toISOStringSafe(product.created_at),
    },
    sku: {
      id: productSku.id,
      code: productSku.sku_code,
      product_title: product.title,
      option_summary: "", // Requires join to attribute values, left empty
      in_stock: productSku.stock > 0,
    },
    quantity: updatedOrderItem.quantity,
    unit_price: updatedOrderItem.unit_price,
    subtotal: updatedOrderItem.subtotal,
    currency: updatedOrderItem.currency,
    delivered: updatedOrderItem.delivered,
    refunded: updatedOrderItem.refunded,
    created_at: toISOStringSafe(updatedOrderItem.created_at),
    updated_at: toISOStringSafe(updatedOrderItem.updated_at),
    deleted_at: updatedOrderItem.deleted_at
      ? toISOStringSafe(updatedOrderItem.deleted_at)
      : undefined,
  };
}
