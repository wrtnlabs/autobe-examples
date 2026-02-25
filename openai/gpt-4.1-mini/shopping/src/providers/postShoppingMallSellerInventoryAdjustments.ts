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
import { ShoppingMallInventoryHistoryCollector } from "../collectors/ShoppingMallInventoryHistoryCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallInventoryHistoryTransformer } from "../transformers/ShoppingMallInventoryHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerInventoryAdjustments(props: {
  seller: SellerPayload;
  body: IShoppingMallInventoryHistory.ICreate;
}): Promise<IShoppingMallInventoryHistory> {
  const data = await ShoppingMallInventoryHistoryCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    // Verify product variant exists
    await tx.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.body.shoppingMallProductVariantId },
    });
    // Create inventory history record
    return tx.shopping_mall_inventory_histories.create({
      data,
      ...ShoppingMallInventoryHistoryTransformer.select(),
    });
  });
  return await ShoppingMallInventoryHistoryTransformer.transform(created);
}
