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

export async function getShoppingMallSellerInventoryHistoriesInventoryHistoryId(props: {
  seller: SellerPayload;
  inventoryHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventoryHistory> {
  const inventoryHistory =
    await MyGlobal.prisma.shopping_mall_inventory_histories.findUniqueOrThrow({
      where: { id: props.inventoryHistoryId },
      ...ShoppingMallInventoryHistoryTransformer.select(),
    });
  const productId = inventoryHistory.productVariant.product.id;
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId },
    select: { seller_id: true },
  });
  if (!product || product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Return the transformed inventory history; conversion to ISO string is done internally or externally wherever needed
  return await ShoppingMallInventoryHistoryTransformer.transform(
    inventoryHistory,
  );
}
