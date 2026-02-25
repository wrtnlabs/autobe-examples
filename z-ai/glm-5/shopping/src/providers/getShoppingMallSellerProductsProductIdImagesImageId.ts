import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string;
  imageId: string;
}): Promise<IShoppingMallProductImage> {
  // Verify seller owns the product
  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: {
        id: props.productId,
        seller_id: props.seller.id,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  // Find the image belonging to this product
  const image =
    await MyGlobal.prisma.shopping_mall_product_images.findFirstOrThrow({
      where: {
        id: props.imageId,
        shopping_mall_product_id: props.productId,
      },
      ...ShoppingMallProductImageTransformer.select(),
    });
  return await ShoppingMallProductImageTransformer.transform(image);
}
