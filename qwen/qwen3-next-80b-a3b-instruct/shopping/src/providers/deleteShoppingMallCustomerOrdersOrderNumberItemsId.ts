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

export async function deleteShoppingMallCustomerOrdersOrderNumberItemsId(props: {
  customer: CustomerPayload;
  orderNumber: string;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  // Find the order by orderNumber
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }

  // Verify order status allows deletion
  if (order.status !== "draft" && order.status !== "pending_payment") {
    throw new HttpException(
      "Cannot delete items from orders that are not in draft or pending_payment status",
      403,
    );
  }

  // Find the specific order item
  const item = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.id,
      shopping_mall_order_id: order.id,
    },
  });

  if (!item) {
    throw new HttpException("Order item not found", 404);
  }

  // Start transaction to ensure financial consistency
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Delete the order item
    await prisma.shopping_mall_order_items.delete({
      where: { id: props.id },
    });

    // Get remaining order items for recalculation
    const remainingItems = await prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_order_id: order.id,
      },
    });

    // Calculate new order totals
    const subtotal = remainingItems.reduce((sum, i) => sum + i.item_total, 0);
    const taxAmount = order.tax_amount; // Keep tax amount as is (per business rules)
    const shippingFee = order.shipping_fee; // Keep shipping fee as is (per business rules)
    const discountAmount = order.discount_amount; // Keep discount as is (per business rules)
    const totalAmount = subtotal + taxAmount + shippingFee - discountAmount;

    // Update the order with recalculated totals
    await prisma.shopping_mall_orders.update({
      where: { id: order.id },
      data: {
        subtotal,
        total_amount: totalAmount,
        updated_at: toISOStringSafe(new Date()),
      },
    });

    // Return the deleted item
    return item;
  });

  return {
    id: result.id,
    shopping_mall_order_id: result.shopping_mall_order_id,
    shopping_mall_product_variant_id:
      (result.shopping_mall_product_variant_id satisfies string | null as
        | string
        | null)!,
    quantity: result.quantity,
    unit_price: result.unit_price,
    item_total: result.item_total,
  };
}
