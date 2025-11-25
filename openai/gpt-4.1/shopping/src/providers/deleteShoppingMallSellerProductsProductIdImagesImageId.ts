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
  // 1. Find product and check seller owns this product
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId, deleted_at: null },
  });
  if (!product) {
    throw new HttpException("Product not found or already deleted.", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product.", 403);
  }

  // 2. Find the image: match imageId + productId, not already deleted
  const image = await MyGlobal.prisma.shopping_mall_product_images.findUnique({
    where: { id: props.imageId },
  });
  if (!image || image.deleted_at !== null) {
    throw new HttpException("Image not found or already deleted.", 404);
  }
  if (image.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Image does not belong to this product.", 404);
  }

  // 3. Soft delete: set deleted_at to now (ISO string)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_product_images.update({
    where: { id: props.imageId },
    data: { deleted_at: now },
  });

  // 4. Reorder: decrement position of all images for this product (not deleted, position > deleted image)
  await MyGlobal.prisma.shopping_mall_product_images.updateMany({
    where: {
      shopping_mall_product_id: props.productId,
      deleted_at: null,
      position: { gt: image.position },
    },
    data: { position: { decrement: 1 } },
  });

  // Success: return void
  return;
}
