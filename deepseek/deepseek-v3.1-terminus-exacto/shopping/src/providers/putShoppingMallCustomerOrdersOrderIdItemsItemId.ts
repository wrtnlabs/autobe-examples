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

export async function putShoppingMallCustomerOrdersOrderIdItemsItemId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  // Check if any update fields are provided
  if (Object.keys(props.body).length === 0) {
    throw new HttpException("No update fields provided", 400);
  }

  // Validate quantity if provided
  if (props.body.quantity !== undefined && props.body.quantity < 1) {
    throw new HttpException("Quantity must be at least 1", 400);
  }

  // Validate unit_price if provided
  if (props.body.unit_price !== undefined && props.body.unit_price < 0) {
    throw new HttpException("Unit price cannot be negative", 400);
  }

  // Validate total_price if provided
  if (props.body.total_price !== undefined && props.body.total_price < 0) {
    throw new HttpException("Total price cannot be negative", 400);
  }

  // Verify the order exists and belongs to the authenticated customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }

  // Check if order is in a modifiable state
  const nonModifiableStatuses = [
    "completed",
    "cancelled",
    "refunded",
    "delivered",
    "shipped",
  ];
  if (nonModifiableStatuses.includes(order.status)) {
    throw new HttpException(
      "Order cannot be modified in its current state",
      400,
    );
  }

  // Verify the order item exists and belongs to the specified order
  const existingItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        id: props.itemId,
        shopping_mall_order_id: props.orderId,
      },
    });

  if (!existingItem) {
    throw new HttpException("Order item not found", 404);
  }

  // Calculate new total price based on updates
  const newQuantity = props.body.quantity ?? existingItem.quantity;
  const newUnitPrice = props.body.unit_price ?? existingItem.unit_price;
  const newTotalPrice = props.body.total_price ?? newQuantity * newUnitPrice;

  // Prepare update data
  const updateData = {
    ...(props.body.quantity !== undefined && { quantity: props.body.quantity }),
    ...(props.body.unit_price !== undefined && {
      unit_price: props.body.unit_price,
    }),
    ...(props.body.total_price !== undefined && {
      total_price: props.body.total_price,
    }),
    ...(props.body.product_name !== undefined && {
      product_name: props.body.product_name,
    }),
    ...(props.body.product_attributes !== undefined && {
      product_attributes: props.body.product_attributes,
    }),
    updated_at: toISOStringSafe(new Date()),
  };

  // If quantity or unit_price changed but total_price wasn't explicitly provided, recalculate
  if (
    (props.body.quantity !== undefined ||
      props.body.unit_price !== undefined) &&
    props.body.total_price === undefined
  ) {
    updateData.total_price = newQuantity * newUnitPrice;
  }

  // Update the order item
  const updated = await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.itemId },
    data: updateData,
  });

  // Return the updated item with proper type conversions
  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_product_variant_id: updated.shopping_mall_product_variant_id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    total_price: updated.total_price,
    product_name: updated.product_name,
    product_attributes: updated.product_attributes ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
