import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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
import { ShoppingMallProductVariantCollector } from "../collectors/ShoppingMallProductVariantCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantTransformer } from "../transformers/ShoppingMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerVariants(props: {
  seller: SellerPayload;
  body: IShoppingMallProductVariant.ICreate;
}): Promise<IShoppingMallProductVariant> {
  const productId = props.body.shopping_mall_product_id;
  if (productId === undefined) {
    throw new HttpException("Product ID is required", 400);
  }
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: productId },
      select: { id: true, shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }
  const existingVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        shopping_mall_product_id: productId,
        sku_code: props.body.sku_code,
        deleted_at: null,
      },
    });
  if (existingVariant !== null) {
    throw new HttpException("SKU code already exists for this product", 409);
  }
  const created = await MyGlobal.prisma.shopping_mall_product_variants.create({
    data: await ShoppingMallProductVariantCollector.collect({
      body: props.body,
      shoppingMallProducts: { id: productId },
    }),
    ...ShoppingMallProductVariantTransformer.select(),
  });
  return await ShoppingMallProductVariantTransformer.transform(created);
}
