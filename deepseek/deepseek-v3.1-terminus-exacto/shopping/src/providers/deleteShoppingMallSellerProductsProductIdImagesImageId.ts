import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the product exists and belongs to the seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException(
      "Product not found or you don't have permission to manage this product",
      404,
    );
  }

  // Check if the image exists and belongs to the specified product
  const image = await MyGlobal.prisma.shopping_mall_product_images.findFirst({
    where: {
      id: props.imageId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });

  if (!image) {
    throw new HttpException("Product image not found", 404);
  }

  // Perform soft deletion by setting deleted_at timestamp
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.shopping_mall_product_images.update({
    where: {
      id: props.imageId,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
