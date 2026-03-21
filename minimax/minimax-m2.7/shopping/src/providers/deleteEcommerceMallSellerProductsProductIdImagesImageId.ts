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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteEcommerceMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify product exists and get seller ownership
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
      },
    });
  // 2. Authorization - verify seller owns the product
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify image exists
  const imageToDelete =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: {
        id: true,
        product_id: true,
        display_order: true,
        image_url: true,
        created_at: true,
        updated_at: true,
      },
    });
  // Ensure image belongs to the specified product
  if (imageToDelete.product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  const deletedDisplayOrder = imageToDelete.display_order;
  const wasMainThumbnail = deletedDisplayOrder === 0;
  // 4. Delete the image record
  await MyGlobal.prisma.ecommerce_mall_product_images.delete({
    where: { id: props.imageId },
  });
  // 5. Business logic: promote next image if main thumbnail was deleted
  if (wasMainThumbnail) {
    // Find the image with the next lowest display_order
    const nextImage =
      await MyGlobal.prisma.ecommerce_mall_product_images.findFirst({
        where: { product_id: props.productId },
        orderBy: { display_order: "asc" },
        select: {
          id: true,
          display_order: true,
        },
      });
    // Promote next image to display_order=0 if exists
    if (nextImage !== null && nextImage.display_order > 0) {
      await MyGlobal.prisma.ecommerce_mall_product_images.update({
        where: { id: nextImage.id },
        data: {
          display_order: 0,
          updated_at: new Date(),
        },
      });
      // Re-index remaining images (shift down by 1)
      await MyGlobal.prisma.ecommerce_mall_product_images.updateMany({
        where: {
          product_id: props.productId,
          display_order: {
            gt: 0,
          },
        },
        data: {
          display_order: {
            decrement: 1,
          },
          updated_at: new Date(),
        },
      });
    }
  } else {
    // Re-index remaining images (decrement by 1 for those with higher display_order)
    await MyGlobal.prisma.ecommerce_mall_product_images.updateMany({
      where: {
        product_id: props.productId,
        display_order: {
          gt: deletedDisplayOrder,
        },
      },
      data: {
        display_order: {
          decrement: 1,
        },
        updated_at: new Date(),
      },
    });
  }
}
