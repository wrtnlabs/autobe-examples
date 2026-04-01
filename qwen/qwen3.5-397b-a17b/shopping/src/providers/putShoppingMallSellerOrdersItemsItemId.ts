import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderItemTransformer } from "../transformers/ShoppingMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerOrdersItemsItemId(props: {
  seller: SellerPayload;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
    });
  if (orderItem.deleted_at !== null) {
    throw new HttpException("Order item is deleted", 400);
  }
  if (orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (orderItem.status === "cancelled" || orderItem.status === "refunded") {
    throw new HttpException(
      "Cannot modify cancelled or refunded order items",
      400,
    );
  }
  if (props.body.status !== undefined) {
    const validStatuses = [
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ];
    if (!validStatuses.includes(props.body.status)) {
      throw new HttpException("Invalid status value", 400);
    }
    const statusTransitions: Record<string, string[]> = {
      paid: ["shipped", "cancelled", "paid"],
      shipped: ["delivered", "shipped"],
      delivered: ["refunded", "delivered"],
      cancelled: ["cancelled"],
      refunded: ["refunded"],
    };
    const allowedTransitions = statusTransitions[orderItem.status] || [];
    if (!allowedTransitions.includes(props.body.status)) {
      throw new HttpException(
        `Invalid status transition from ${orderItem.status} to ${props.body.status}`,
        400,
      );
    }
  }
  await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.itemId },
    data: {
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.quantity !== undefined && {
        quantity: props.body.quantity,
      }),
      ...(props.body.price !== undefined && { price: props.body.price }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...ShoppingMallOrderItemTransformer.select(),
    });
  return await ShoppingMallOrderItemTransformer.transform(updated);
}
