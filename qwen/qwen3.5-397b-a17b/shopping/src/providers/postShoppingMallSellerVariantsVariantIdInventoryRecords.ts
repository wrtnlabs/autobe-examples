import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
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
import { ShoppingMallInventoryRecordCollector } from "../collectors/ShoppingMallInventoryRecordCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallInventoryRecordTransformer } from "../transformers/ShoppingMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerVariantsVariantIdInventoryRecords(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.ICreate;
}): Promise<IShoppingMallInventoryRecord> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        product: {
          select: {
            shopping_mall_seller_id: true,
          },
        },
      },
    });
  if (variant.product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const record = await MyGlobal.prisma.shopping_mall_inventory_records.create({
    data: await ShoppingMallInventoryRecordCollector.collect({
      body: props.body,
      shoppingMallProductVariants: { id: props.variantId },
    }),
    ...ShoppingMallInventoryRecordTransformer.select(),
  });
  return await ShoppingMallInventoryRecordTransformer.transform(record);
}
