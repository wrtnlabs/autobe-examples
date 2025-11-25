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

export async function postShoppingMallCustomerOrdersOrderIdOrderItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.ICreate;
}): Promise<IShoppingMallOrderItem> {
  // Verify the order exists and belongs to the customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: Order does not belong to customer",
      403,
    );
  }

  // Verify that the product variant exists
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.body.shopping_mall_product_variant_id },
    });
  if (!productVariant) {
    throw new HttpException("Product variant not found", 404);
  }

  // Validate quantity, should be > 0
  if (props.body.quantity <= 0) {
    throw new HttpException("Quantity must be a positive integer", 400);
  }

  // Validate total_price matches quantity * unit_price
  const calculatedTotalPrice = props.body.quantity * props.body.unit_price;
  if (calculatedTotalPrice !== props.body.total_price) {
    throw new HttpException(
      "Total price must equal quantity multiplied by unit price",
      400,
    );
  }

  // Create new order item
  const created = await MyGlobal.prisma.shopping_mall_order_items.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: props.orderId,
      shopping_mall_product_variant_id:
        props.body.shopping_mall_product_variant_id,
      quantity: props.body.quantity,
      unit_price: props.body.unit_price,
      total_price: props.body.total_price,
    },
  });

  // Return the created order item
  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_product_variant_id: created.shopping_mall_product_variant_id,
    quantity: created.quantity,
    unit_price: created.unit_price,
    total_price: created.total_price,
  };
}
