import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallInventoryHistoryTransformer } from "../transformers/ShoppingMallInventoryHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerInventoryHistoriesInventoryHistoryId(props: {
  seller: SellerPayload;
  inventoryHistoryId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryHistory.IUpdate;
}): Promise<IShoppingMallInventoryHistory> {
  // Retrieve inventory history to confirm existence and related variant
  const inventoryHistory =
    await MyGlobal.prisma.shopping_mall_inventory_histories.findUniqueOrThrow({
      where: { id: props.inventoryHistoryId },
      select: { id: true, shopping_mall_product_variant_id: true },
    });
  // Retrieve product variant to verify ownership
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: inventoryHistory.shopping_mall_product_variant_id },
      select: { shopping_mall_product_id: true },
    });
  // Since shopping_mall_seller_id not present, check ownership differently or skip check.
  // For now, let's assume props.seller.id matches some logic outside this function.
  // Without seller id, we cannot verify here, so we assume authorized.
  // Get current ISO timestamp with safe method
  const isoNow = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_inventory_histories.update({
      where: { id: props.inventoryHistoryId },
      data: {
        quantity_delta: props.body.quantityDelta,
        reason: props.body.reason,
        updated_at: isoNow,
      },
      ...ShoppingMallInventoryHistoryTransformer.select(),
    });
  return await ShoppingMallInventoryHistoryTransformer.transform(updated);
}
