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

export async function getShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string;
}): Promise<IShoppingMallProductImage[]> {
  // Validate product exists and belongs to seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: {
        id: props.productId,
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
    },
  );
  // Retrieve all images for the product, ordered by sort_order ascending
  const images = await MyGlobal.prisma.shopping_mall_product_images.findMany({
    where: {
      shopping_mall_product_id: props.productId,
    },
    orderBy: {
      sort_order: "asc",
    },
    ...ShoppingMallProductImageTransformer.select(),
  });
  // Transform database records to API response format
  return await ArrayUtil.asyncMap(
    images,
    ShoppingMallProductImageTransformer.transform,
  );
}
