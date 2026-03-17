import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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

export async function postShoppingMallSellerProductsProductIdVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.ICreate;
}): Promise<IShoppingMallInventoryRecord> {
  // Validate variant exists and belongs to a product owned by the seller
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        product: {
          select: {
            id: true,
            shopping_seller_id: true,
          },
        },
      },
    });
  // Verify product ownership
  if (variant.product.shopping_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Create inventory record using Collector
  const created = await MyGlobal.prisma.shopping_mall_inventory_records.create({
    data: await ShoppingMallInventoryRecordCollector.collect({
      body: props.body,
      shoppingMallProductVariants: { id: props.variantId },
    }),
    ...ShoppingMallInventoryRecordTransformer.select(),
  });
  // Transform and return using Transformer
  return await ShoppingMallInventoryRecordTransformer.transform(created);
}
