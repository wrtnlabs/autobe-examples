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

export async function putShoppingMallCustomerOrdersOrderCodeItemsItemId(props: {
  customer: CustomerPayload;
  orderCode: string;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  const { customer, orderCode, itemId, body } = props;

  // 1. Find the order by orderCode and customer ID, and check not deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_code: orderCode,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });

  if (!order) {
    throw new HttpException(
      "Order not found or you do not have permission",
      404,
    );
  }

  // 2. Find the order item by itemId and order id, ensure not deleted
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: itemId,
      shopping_mall_order_id: order.id,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_order_id: true,
      shopping_mall_product_sku_id: true,
      quantity: true,
      unit_price: true,
      total_price: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }

  // 3. Prepare updated fields (only those provided)
  const now = toISOStringSafe(new Date());

  // Handle undefined fields for partial updates
  const updatedData = {
    quantity: body.quantity ?? undefined,
    unit_price: body.unit_price ?? undefined,
    total_price: body.total_price ?? undefined,
    updated_at: now,
  };

  // 4. Update the order item
  const updated = await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: itemId },
    data: updatedData,
  });

  // 5. Return updated item mapped to IShoppingMallOrderItem interface
  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id,
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    total_price: updated.total_price,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
