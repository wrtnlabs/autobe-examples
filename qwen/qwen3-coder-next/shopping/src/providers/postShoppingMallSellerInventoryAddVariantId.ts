import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallInventoryHistoryCollector } from "../collectors/ShoppingMallInventoryHistoryCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallInventoryHistoryTransformer } from "../transformers/ShoppingMallInventoryHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerInventoryAddVariantId(props: {
  seller: SellerPayload;
  variantId: string;
  body: IShoppingMallInventoryHistory.ICreate;
}): Promise<IShoppingMallInventoryHistory> {
  // Validate variant exists and belongs to seller
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { shopping_mall_product_id: true },
    });
  // Validate quantity is positive
  if (props.body.quantity_change <= 0) {
    throw new HttpException("Quantity must be positive", 400);
  }
  // Create inventory history record with positive quantity (restock)
  const history =
    await MyGlobal.prisma.shopping_mall_inventory_histories.create({
      data: await ShoppingMallInventoryHistoryCollector.collect({
        body: props.body,
      }),
      ...ShoppingMallInventoryHistoryTransformer.select(),
    });
  return await ShoppingMallInventoryHistoryTransformer.transform(history);
}
