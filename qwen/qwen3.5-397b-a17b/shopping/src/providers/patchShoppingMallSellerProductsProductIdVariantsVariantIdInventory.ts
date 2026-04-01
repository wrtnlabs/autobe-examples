import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryRecord";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductInventoryRecordCollector } from "../collectors/ShoppingMallProductInventoryRecordCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductInventoryRecordTransformer } from "../transformers/ShoppingMallProductInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductInventoryRecord.ICreate;
}): Promise<IShoppingMallProductInventoryRecord> {
  // Validate product exists and is owned by seller
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate variant exists and belongs to the product
  await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
    where: { id: props.variantId },
    select: { id: true, shopping_mall_product_id: true },
  });
  // Create inventory record using collector
  const record =
    await MyGlobal.prisma.shopping_mall_product_inventory_records.create({
      data: await ShoppingMallProductInventoryRecordCollector.collect({
        body: props.body,
        shoppingMallProductVariants: { id: props.variantId },
      }),
      ...ShoppingMallProductInventoryRecordTransformer.select(),
    });
  // Calculate current stock by summing all quantity changes for this variant
  const stockResult =
    await MyGlobal.prisma.shopping_mall_product_inventory_records.aggregate({
      where: { product_variant_id: props.variantId },
      _sum: { quantity_change: true },
    });
  const currentStock = stockResult._sum.quantity_change ?? 0;
  // Transform and return with computed current_stock
  const transformed =
    await ShoppingMallProductInventoryRecordTransformer.transform(record);
  return {
    ...transformed,
    current_stock: currentStock as number & tags.Type<"int32">,
  };
}
