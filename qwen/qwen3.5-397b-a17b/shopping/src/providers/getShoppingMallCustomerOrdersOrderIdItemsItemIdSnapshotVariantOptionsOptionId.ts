import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderItemSnapshotVariantOptionTransformer } from "../transformers/ShoppingMallOrderItemSnapshotVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrdersOrderIdItemsItemIdSnapshotVariantOptionsOptionId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItemSnapshotVariantOption> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { customer_id: true },
  });
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: { shopping_mall_order_id: true },
    });
  if (orderItem.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Not Found", 404);
  }
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findFirstOrThrow({
      where: {
        shopping_mall_order_item_id: props.itemId,
      },
      select: { id: true },
    });
  const variantOption =
    await MyGlobal.prisma.shopping_mall_order_item_snapshot_variant_options.findFirstOrThrow(
      {
        where: {
          order_item_snapshot_id: snapshot.id,
          product_option_value_id: props.optionId,
        },
        ...ShoppingMallOrderItemSnapshotVariantOptionTransformer.select(),
      },
    );
  return await ShoppingMallOrderItemSnapshotVariantOptionTransformer.transform(
    variantOption,
  );
}
