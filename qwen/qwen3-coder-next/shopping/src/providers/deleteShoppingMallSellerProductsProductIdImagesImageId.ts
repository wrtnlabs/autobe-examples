import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string;
  imageId: string;
}): Promise<void> {
  // Check seller ownership or admin privileges
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Verify seller ownership (seller can only delete images from their own products)
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }
  // Load the image to be deleted
  const image = await MyGlobal.prisma.shopping_mall_product_images.findUnique({
    where: { id: props.imageId },
  });
  if (!image) {
    throw new HttpException("Image not found", 404);
  }
  // Verify image belongs to the product
  if (image.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Image does not belong to this product", 400);
  }
  // Count total images for this product
  const imageCount = await MyGlobal.prisma.shopping_mall_product_images.count({
    where: { shopping_mall_product_id: props.productId },
  });
  // Ensure at least one image remains
  if (imageCount <= 1) {
    throw new HttpException("Cannot delete the last image", 400);
  }
  // Start transaction for consistency
  const deletedImage =
    await MyGlobal.prisma.shopping_mall_product_images.delete({
      where: { id: props.imageId },
    });
  // Reorder remaining images sequentially starting from 0
  const remainingImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: props.productId },
      orderBy: { sort_order: "asc" },
    });
  // Update sort_order for remaining images to be sequential
  for (let i = 0; i < remainingImages.length; i++) {
    if (remainingImages[i].sort_order !== i) {
      await MyGlobal.prisma.shopping_mall_product_images.update({
        where: { id: remainingImages[i].id },
        data: { sort_order: i },
      });
    }
  }
}
