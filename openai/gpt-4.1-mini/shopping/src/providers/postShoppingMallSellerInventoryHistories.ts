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

export async function postShoppingMallSellerInventoryHistories(props: {
  seller: SellerPayload;
  body: IShoppingMallInventoryHistory.ICreate;
}): Promise<IShoppingMallInventoryHistory> {
  // 1. Fetch product variant with related product info including seller id
  const variantWithProduct =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.body.shoppingMallProductVariantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        product: {
          select: {
            seller_id: true,
          },
        },
      },
    });
  // 2. Validate existence and ownership
  if (
    variantWithProduct === null ||
    variantWithProduct.product.seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Prepare the create data
  const createData = await ShoppingMallInventoryHistoryCollector.collect({
    body: props.body,
  });
  // 4. Create the inventory history record
  const created =
    await MyGlobal.prisma.shopping_mall_inventory_histories.create({
      data: createData,
    });
  // 5. Fetch full created record including productVariant relation
  const fullCreated =
    await MyGlobal.prisma.shopping_mall_inventory_histories.findUniqueOrThrow({
      where: { id: created.id },
      ...ShoppingMallInventoryHistoryTransformer.select(),
    });
  // 6. Transform to API format and return
  return await ShoppingMallInventoryHistoryTransformer.transform(fullCreated);
}
