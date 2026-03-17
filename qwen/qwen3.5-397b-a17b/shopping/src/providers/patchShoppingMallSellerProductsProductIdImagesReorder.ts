import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function patchShoppingMallSellerProductsProductIdImagesReorder(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductImage> {
  // Validate product exists and belongs to the seller
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: {
      id: props.productId,
      shopping_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  // Query all non-deleted images for this product, ordered by display_order
  const images = await MyGlobal.prisma.shopping_mall_product_images.findMany({
    where: {
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    orderBy: {
      display_order: "asc",
    },
    ...ShoppingMallProductImageTransformer.select(),
  });
  // Return the first image (main thumbnail) as per singular return type
  if (images.length === 0) {
    throw new HttpException("No images found for this product", 404);
  }
  return await ShoppingMallProductImageTransformer.transform(images[0]!);
}
