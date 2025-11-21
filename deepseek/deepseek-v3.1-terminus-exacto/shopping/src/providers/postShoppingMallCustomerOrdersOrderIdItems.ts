import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.ICreate;
}): Promise<IShoppingMallOrderItem> {
  // Verify the order exists and belongs to the customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: {
      id: props.orderId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }

  // Verify the product variant exists and is active
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: {
        id: props.body.shopping_mall_product_variant_id,
        active: true,
        deleted_at: null,
      },
      include: {
        product: {
          select: {
            shopping_mall_seller_id: true,
            name: true,
          },
        },
      },
    });

  if (!productVariant) {
    throw new HttpException("Product variant not found or unavailable", 404);
  }

  // Check if product variant has sufficient stock
  if (productVariant.stock_quantity < props.body.quantity) {
    throw new HttpException("Insufficient stock available", 400);
  }

  // Calculate pricing using variant price
  const unitPrice = productVariant.price;
  if (!unitPrice) {
    throw new HttpException("Product pricing not available", 400);
  }

  const totalPrice = unitPrice * props.body.quantity;
  const now = toISOStringSafe(new Date());

  // Create the order item
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: props.orderId,
      shopping_mall_product_variant_id:
        props.body.shopping_mall_product_variant_id,
      shopping_mall_seller_id: productVariant.product.shopping_mall_seller_id,
      quantity: props.body.quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      product_name: productVariant.variant_name,
      product_attributes: productVariant.attributes,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: orderItem.id,
    shopping_mall_order_id: orderItem.shopping_mall_order_id,
    shopping_mall_product_variant_id:
      orderItem.shopping_mall_product_variant_id,
    shopping_mall_seller_id: orderItem.shopping_mall_seller_id,
    quantity: orderItem.quantity,
    unit_price: orderItem.unit_price,
    total_price: orderItem.total_price,
    product_name: orderItem.product_name,
    product_attributes: orderItem.product_attributes ?? undefined,
    created_at: toISOStringSafe(orderItem.created_at),
    updated_at: toISOStringSafe(orderItem.updated_at),
  };
}
