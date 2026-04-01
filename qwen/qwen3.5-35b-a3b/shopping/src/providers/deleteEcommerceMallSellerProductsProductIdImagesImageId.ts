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
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  const image = await MyGlobal.prisma.ecommerce_mall_product_images.findFirst({
    where: {
      id: props.imageId,
      product_id: props.productId,
      deleted_at: null,
    },
  });
  if (image === null) {
    throw new HttpException("Image not found", 404);
  }
  // Get all remaining images before deletion to properly reorder them
  const remainingImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId,
        id: { not: props.imageId },
        deleted_at: null,
      },
      orderBy: { display_order: "asc" },
    });
  // If deleting the main thumbnail (display_order 0), promote next image to display_order 0
  if (image.display_order === 0 && remainingImages.length > 0) {
    await MyGlobal.prisma.ecommerce_mall_product_images.update({
      where: { id: remainingImages[0].id },
      data: { display_order: 0 },
    });
  }
  // Recalculate display_order for all remaining images to maintain sequential order
  for (const [index, remainingImage] of remainingImages.entries()) {
    if (image.display_order === 0 && index === 0) {
      // First remaining image already set to 0 above
      continue;
    }
    const newDisplayOrderValue =
      image.display_order === 0
        ? remainingImages.slice(1).indexOf(remainingImage) + 1
        : remainingImages.findIndex((r) => r.id === remainingImage.id) + 1;
    await MyGlobal.prisma.ecommerce_mall_product_images.update({
      where: { id: remainingImage.id },
      data: { display_order: newDisplayOrderValue },
    });
  }
  // Soft delete the target image by setting deleted_at timestamp
  const deletionTimestamp = new Date().toISOString();
  await MyGlobal.prisma.ecommerce_mall_product_images.update({
    where: { id: props.imageId },
    data: { deleted_at: deletionTimestamp },
  });
  // Log the deletion in activity logs
  const activityLogTimestamp = new Date().toISOString();
  await MyGlobal.prisma.ecommerce_mall_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "seller",
      entity_type: "product_image",
      entity_id: props.imageId,
      action_type: "deleted",
      action_description: `Product image deleted by seller ${props.seller.id}`,
      ip_address: null,
      user_agent: null,
      created_at: activityLogTimestamp,
      updated_at: activityLogTimestamp,
      deleted_at: null,
    },
  });
}
