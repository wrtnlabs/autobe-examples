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

export async function deleteEcommerceMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Validate imageId exists and belongs to the product first
  const existingImage =
    await MyGlobal.prisma.ecommerce_mall_product_images.findFirst({
      where: {
        id: props.imageId,
        product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true, display_order: true },
    });
  if (existingImage === null) {
    throw new HttpException("Image not found", 404);
  }
  // Validate product exists and belongs to the seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
      seller_id: props.seller.id,
    },
    select: { id: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Step 1: If this is the main thumbnail (display_order = 0), promote next image
    if (existingImage.display_order === 0) {
      const nextImage = await tx.ecommerce_mall_product_images.findFirst({
        where: {
          product_id: props.productId,
          display_order: { gt: 0 },
          deleted_at: null,
        },
        orderBy: { display_order: "asc" },
      });
      if (nextImage !== null) {
        // Update next image to become new thumbnail
        await tx.ecommerce_mall_product_images.update({
          where: { id: nextImage.id },
          data: { display_order: 0 },
        });
        // Recalculate display_order for remaining images
        await tx.ecommerce_mall_product_images.updateMany({
          where: {
            product_id: props.productId,
            display_order: { gt: nextImage.display_order },
            deleted_at: null,
          },
          data: { display_order: { decrement: 1 } },
        });
      }
    } else {
      // Image is not main thumbnail - just decrement higher order values
      await tx.ecommerce_mall_product_images.updateMany({
        where: {
          product_id: props.productId,
          display_order: { gt: existingImage.display_order },
          deleted_at: null,
        },
        data: { display_order: { decrement: 1 } },
      });
    }
    // Step 2: Soft delete the image
    await tx.ecommerce_mall_product_images.update({
      where: { id: props.imageId },
      data: { deleted_at: new Date() },
    });
    // Step 3: Log the activity
    const activityLog = await tx.ecommerce_mall_activity_logs.create({
      data: {
        id: v4(),
        actor_type: "seller",
        entity_type: "product_image",
        entity_id: props.imageId,
        action_type: "delete",
        action_description: `Seller deleted product image ${props.imageId}`,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    // Step 4: Create seller reference for the activity log
    await tx.ecommerce_mall_activity_log_of_sellers.create({
      data: {
        id: v4(),
        ecommerce_mall_activity_log_id: activityLog.id,
        ecommerce_mall_seller_id: props.seller.id,
        ecommerce_mall_seller_session_id: props.seller.session_id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  });
}
