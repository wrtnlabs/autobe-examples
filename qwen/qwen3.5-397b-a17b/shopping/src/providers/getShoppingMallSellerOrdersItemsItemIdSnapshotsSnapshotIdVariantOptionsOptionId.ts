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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderItemSnapshotVariantOptionTransformer } from "../transformers/ShoppingMallOrderItemSnapshotVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerOrdersItemsItemIdSnapshotsSnapshotIdVariantOptionsOptionId(props: {
  seller: SellerPayload;
  itemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItemSnapshotVariantOption> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_order_item_snapshots.findUniqueOrThrow({
    where: {
      id: props.snapshotId,
      shopping_mall_order_item_id: props.itemId,
    },
  });
  const variantOption =
    await MyGlobal.prisma.shopping_mall_order_item_snapshot_variant_options.findUniqueOrThrow(
      {
        where: {
          id: props.optionId,
          order_item_snapshot_id: props.snapshotId,
        },
        ...ShoppingMallOrderItemSnapshotVariantOptionTransformer.select(),
      },
    );
  return await ShoppingMallOrderItemSnapshotVariantOptionTransformer.transform(
    variantOption,
  );
}
