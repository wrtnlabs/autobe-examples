import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  const { seller, productId, imageId } = props;

  // Step 1: Verify product exists and belongs to seller (authorization)
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId },
    select: {
      id: true,
      shopping_mall_seller_id: true,
    },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  if (product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: You can only delete images from your own products",
      403,
    );
  }

  // Step 2: Verify image exists and belongs to product
  const image = await MyGlobal.prisma.shopping_mall_product_images.findUnique({
    where: { id: imageId },
    select: {
      id: true,
      shopping_mall_product_id: true,
      display_order: true,
      is_primary: true,
    },
  });

  if (!image) {
    throw new HttpException("Image not found", 404);
  }

  if (image.shopping_mall_product_id !== productId) {
    throw new HttpException(
      "Image does not belong to the specified product",
      400,
    );
  }

  // Step 3: Check if it's the last remaining image (business rule)
  const totalImages = await MyGlobal.prisma.shopping_mall_product_images.count({
    where: { shopping_mall_product_id: productId },
  });

  if (totalImages <= 1) {
    throw new HttpException(
      "Cannot delete the last remaining product image. Products must have at least one image.",
      400,
    );
  }

  // Step 4: Handle primary image promotion if deleting the primary image
  if (image.is_primary) {
    const nextPrimaryImage =
      await MyGlobal.prisma.shopping_mall_product_images.findFirst({
        where: {
          shopping_mall_product_id: productId,
          id: { not: imageId },
        },
        orderBy: { display_order: "asc" },
        select: { id: true },
      });

    if (nextPrimaryImage) {
      await MyGlobal.prisma.shopping_mall_product_images.update({
        where: { id: nextPrimaryImage.id },
        data: { is_primary: true },
      });
    }
  }

  // Step 5: Delete the image (hard delete)
  await MyGlobal.prisma.shopping_mall_product_images.delete({
    where: { id: imageId },
  });

  // Step 6: Recalculate display_order for remaining images
  const remainingImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: productId },
      orderBy: { display_order: "asc" },
      select: { id: true, display_order: true },
    });

  const updatePromises = remainingImages
    .map((currentImage, index) => {
      if (currentImage.display_order !== index) {
        return MyGlobal.prisma.shopping_mall_product_images.update({
          where: { id: currentImage.id },
          data: { display_order: index },
        });
      }
      return null;
    })
    .filter((promise) => promise !== null);

  if (updatePromises.length > 0) {
    await Promise.all(updatePromises);
  }
}
