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
  // 1. Validate product exists and is not deleted
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId, deleted_at: null },
      select: { id: true, seller_id: true },
    });
  // 2. Verify seller ownership
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate image exists and belongs to product
  const image =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: {
        id: true,
        ecommerce_mall_product_id: true,
        sort_order: true,
        is_primary: true,
        deleted_at: true,
      },
    });
  if (image.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException("Image not found", 404);
  }
  if (image.deleted_at !== null) {
    throw new HttpException("Image already deleted", 400);
  }
  // 4. Count remaining non-deleted images
  const remainingImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: { ecommerce_mall_product_id: props.productId, deleted_at: null },
      select: { id: true, sort_order: true, is_primary: true },
    });
  if (remainingImages.length <= 1) {
    throw new HttpException("Cannot delete the last image", 400);
  }
  // 5. Get current product state for snapshot (before deletion)
  const currentImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: { ecommerce_mall_product_id: props.productId, deleted_at: null },
      orderBy: { sort_order: "asc" },
      select: { id: true, url: true, sort_order: true, is_primary: true },
    });
  const beforeSnapshot = {
    ...product,
    images: currentImages,
  };
  // 6. Handle thumbnail promotion if deleting primary image
  const isDeletingPrimary = image.is_primary;
  let promotedImageId: string | null = null;
  if (isDeletingPrimary) {
    // Find image with next lowest sort_order
    const nextImage = remainingImages
      .filter((img) => img.id !== props.imageId)
      .sort((a, b) => a.sort_order - b.sort_order)[0];
    if (nextImage) {
      promotedImageId = nextImage.id;
    }
  }
  // 7. Soft-delete target image
  await MyGlobal.prisma.ecommerce_mall_product_images.update({
    where: { id: props.imageId },
    data: { deleted_at: new Date() },
  });
  // 8. Reorder remaining images
  const imagesToUpdate = remainingImages
    .filter((img) => img.id !== props.imageId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img, index) => ({
      id: img.id,
      sort_order: index,
      is_primary: promotedImageId === img.id,
    }));
  await MyGlobal.prisma.$transaction(
    imagesToUpdate.map((update) =>
      MyGlobal.prisma.ecommerce_mall_product_images.update({
        where: { id: update.id },
        data: {
          sort_order: update.sort_order,
          is_primary: update.is_primary,
          updated_at: new Date(),
        },
      }),
    ),
  );
  // 9. Get updated images for after snapshot
  const afterImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: { ecommerce_mall_product_id: props.productId, deleted_at: null },
      orderBy: { sort_order: "asc" },
      select: { id: true, url: true, sort_order: true, is_primary: true },
    });
  const afterSnapshot = {
    ...product,
    images: afterImages,
  };
  // 10. Create product snapshot
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ecommerce_mall_products_id: props.productId,
      ecommerce_mall_sellers_id: props.seller.id,
      previous_values: JSON.stringify(beforeSnapshot),
      current_values: JSON.stringify(afterSnapshot),
      created_at: new Date(),
    },
  });
}
