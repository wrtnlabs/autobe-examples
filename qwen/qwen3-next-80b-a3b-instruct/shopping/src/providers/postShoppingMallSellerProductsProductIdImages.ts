import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductImageCollector } from "../collectors/ShoppingMallProductImageCollector";
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";

export async function postShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string;
  body: IShoppingMallProductImage.ICreate;
}): Promise<IShoppingMallProductImage> {
  // Verify product exists and belongs to seller
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or not owned by seller", 404);
  }
  // Use collector to transform API DTO to Prisma CreateInput
  const createdImage =
    await MyGlobal.prisma.shopping_mall_product_images.create({
      data: await ShoppingMallProductImageCollector.collect({
        body: props.body,
      }),
      ...ShoppingMallProductImageTransformer.select(),
    });
  // Transform Prisma result to API response using transformer
  return await ShoppingMallProductImageTransformer.transform(createdImage);
}
