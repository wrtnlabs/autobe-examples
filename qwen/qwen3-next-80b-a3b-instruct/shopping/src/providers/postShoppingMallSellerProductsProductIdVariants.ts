import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductVariantCollector } from "../collectors/ShoppingMallProductVariantCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantTransformer } from "../transformers/ShoppingMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string;
  body: IShoppingMallProductVariant.ICreate;
}): Promise<IShoppingMallProductVariant> {
  // Verify product exists and is owned by seller
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        seller_id: props.seller.id,
        deleted_at: null,
      },
    });
  // Verify SKU is unique within this product
  const existingVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        product_id: props.productId,
        sku_code: props.body.sku_code,
        deleted_at: null,
      },
    });
  if (existingVariant) {
    throw new HttpException("SKU code already exists for this product", 409);
  }
  // Use collector to transform DTO into Prisma input
  const variantData = await ShoppingMallProductVariantCollector.collect({
    body: props.body,
    shoppingMallProducts: product,
  });
  // Create the variant
  const created = await MyGlobal.prisma.shopping_mall_product_variants.create({
    data: variantData,
    ...ShoppingMallProductVariantTransformer.select(),
  });
  // Return transformed response
  return await ShoppingMallProductVariantTransformer.transform(created);
}
