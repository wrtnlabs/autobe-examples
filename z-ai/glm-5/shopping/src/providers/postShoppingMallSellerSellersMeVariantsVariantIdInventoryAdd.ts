import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductInventoryHistoryCollector } from "../collectors/ShoppingMallProductInventoryHistoryCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductInventoryHistoryTransformer } from "../transformers/ShoppingMallProductInventoryHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSellersMeVariantsVariantIdInventoryAdd(props: {
  seller: SellerPayload;
  variantId: string;
  body: IShoppingMallProductInventoryHistory.ICreate;
}): Promise<IShoppingMallProductInventoryHistory> {
  // Verify variant exists and belongs to authenticated seller
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
      where: {
        id: props.variantId,
        deleted_at: null,
        product: {
          seller_id: props.seller.id,
        },
      },
      select: {
        id: true,
      },
    });
  // Create inventory history record using collector
  const created =
    await MyGlobal.prisma.shopping_mall_product_inventory_histories.create({
      data: await ShoppingMallProductInventoryHistoryCollector.collect({
        body: props.body,
        shoppingMallProductVariants: variant,
      }),
      ...ShoppingMallProductInventoryHistoryTransformer.select(),
    });
  // Transform and return response
  return await ShoppingMallProductInventoryHistoryTransformer.transform(
    created,
  );
}
