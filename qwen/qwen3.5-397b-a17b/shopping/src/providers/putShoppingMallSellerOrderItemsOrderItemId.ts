import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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

export async function putShoppingMallSellerOrderItemsOrderItemId(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      ...ShoppingMallOrderItemTransformer.select(),
    });
  if (orderItem.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.status !== undefined) {
    const currentStatus = orderItem.status;
    const newStatus = props.body.status;
    const validTransitions: Record<string, string[]> = {
      PAID: ["SHIPPED", "CANCELLED"],
      SHIPPED: ["DELIVERED", "CANCELLED"],
      DELIVERED: ["REFUNDED"],
      CANCELLED: [],
      REFUNDED: [],
    };
    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new HttpException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400,
      );
    }
  }
  if (props.body.quantity !== undefined && props.body.quantity < 1) {
    throw new HttpException("Quantity must be a positive integer", 400);
  }
  if (props.body.unit_price !== undefined && props.body.unit_price < 0) {
    throw new HttpException("Unit price cannot be negative", 400);
  }
  await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.orderItemId },
    data: {
      ...(props.body.quantity !== undefined && {
        quantity: props.body.quantity,
      }),
      ...(props.body.unit_price !== undefined && {
        unit_price: props.body.unit_price,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      ...ShoppingMallOrderItemTransformer.select(),
    });
  return await ShoppingMallOrderItemTransformer.transform(updated);
}
