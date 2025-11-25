import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerOrdersOrderNumberItemsId(props: {
  customer: CustomerPayload;
  orderNumber: string;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  // Fetch the order to verify it exists and belongs to the customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
      status: {
        in: ["draft", "pending_payment"],
      },
    },
  });

  if (!order) {
    throw new HttpException("Order not found or not in modifiable state", 404);
  }

  // Fetch the current order item
  const currentItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUnique({
      where: {
        id: props.id,
        shopping_mall_order_id: order.id,
      },
    });

  if (!currentItem) {
    throw new HttpException("Order item not found", 404);
  }

  // Calculate new unit_price if provided, otherwise use current product variant price
  let newUnitPrice = props.body.unit_price;
  if (newUnitPrice === undefined) {
    const variant =
      await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
        where: {
          id: currentItem.shopping_mall_product_variant_id ?? "",
          deleted_at: null,
        },
      });

    if (!variant) {
      throw new HttpException("Product variant not found", 404);
    }

    newUnitPrice = variant.price;
  }

  // Get current values if not updated
  const quantity =
    props.body.quantity !== undefined
      ? props.body.quantity
      : currentItem.quantity;
  const notes =
    props.body.notes !== undefined ? props.body.notes : currentItem.notes;

  // Update the order item with new values
  const updatedItem = await MyGlobal.prisma.shopping_mall_order_items.update({
    where: {
      id: props.id,
    },
    data: {
      quantity,
      unit_price: newUnitPrice,
      notes,
      item_total: quantity * newUnitPrice,
    },
  });

  return {
    id: updatedItem.id,
    shopping_mall_order_id: updatedItem.shopping_mall_order_id ?? "",
    shopping_mall_product_variant_id:
      updatedItem.shopping_mall_product_variant_id ?? "",
    quantity: updatedItem.quantity,
    unit_price: updatedItem.unit_price,
    item_total: updatedItem.item_total,
  };
}
