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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerOrdersOrderNumberItemsOrderItemId(props: {
  customer: CustomerPayload;
  orderNumber: string;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  // Find the order by order number and customer (ownership enforced)
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Order not found for customer", 404);
  }

  // Find order item by id and its parent order; only not soft-deleted
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      shopping_mall_order_id: order.id,
      deleted_at: null,
    },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }

  // Prepare update payload
  let nextQuantity = orderItem.quantity;
  if (Object.prototype.hasOwnProperty.call(props.body, "quantity")) {
    nextQuantity = props.body.quantity!;
    if (nextQuantity <= 0) {
      throw new HttpException("Quantity must be positive", 400);
    }
  }
  let nextUnitPrice = orderItem.unit_price;
  if (Object.prototype.hasOwnProperty.call(props.body, "unit_price")) {
    nextUnitPrice = props.body.unit_price!;
    if (nextUnitPrice < 0) {
      throw new HttpException("Unit price must be non-negative", 400);
    }
  }
  let nextDelivered = orderItem.delivered;
  if (Object.prototype.hasOwnProperty.call(props.body, "delivered")) {
    nextDelivered = props.body.delivered!;
  }
  let nextRefunded = orderItem.refunded;
  if (Object.prototype.hasOwnProperty.call(props.body, "refunded")) {
    nextRefunded = props.body.refunded!;
  }
  const updateData = {
    quantity: nextQuantity,
    unit_price: nextUnitPrice,
    subtotal: nextQuantity * nextUnitPrice,
    delivered: nextDelivered,
    refunded: nextRefunded,
    updated_at: toISOStringSafe(new Date()),
  };
  const updatedItem = await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: orderItem.id },
    data: updateData,
  });

  // Fetch required relations for summary DTOs
  const [product, sku] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.findUnique({
      where: { id: updatedItem.shopping_mall_product_id },
    }),
    MyGlobal.prisma.shopping_mall_product_skus.findUnique({
      where: { id: updatedItem.shopping_mall_product_sku_id },
    }),
  ]);
  if (!product || !sku) {
    throw new HttpException("Product or SKU not found for order item", 500);
  }

  return {
    id: updatedItem.id,
    order: {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      currency: order.currency,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      deleted_at: order.deleted_at ? toISOStringSafe(order.deleted_at) : null,
    },
    product: {
      id: product.id,
      title: product.title,
      default_price: product.default_price,
      business_status: product.business_status,
      seller: { id: product.shopping_mall_seller_id, business_name: "" },
      categories: [],
      created_at: toISOStringSafe(product.created_at),
    },
    sku: {
      id: sku.id,
      code: sku.sku_code,
      product_title: product.title,
      option_summary: "",
      in_stock: sku.status === "active" && sku.stock > 0,
    },
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
      : null,
  };
}
