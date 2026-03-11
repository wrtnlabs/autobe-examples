import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductImageAtSummaryTransformer } from "../transformers/EcommerceMallProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdImages(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.IManageRequest;
}): Promise<IEcommerceMallProductImage.ISummary> {
  // Step 1: Verify product exists
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, seller_id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Step 2: Query all active images for the product
  const allImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      include: { product: true },
      orderBy: { display_order: "asc" },
    });
  // Step 3: Validate image orders array
  if (props.body.imageOrders.length === 0) {
    // Empty body is valid - return current state
    const transformResult = allImages.map(async (img) =>
      EcommerceMallProductImageAtSummaryTransformer.transform(img),
    );
    const transformedImages = await ArrayUtil.asyncMap(
      transformResult,
      (r) => r,
    );
    if (transformedImages.length === 0) {
      throw new HttpException("No images found for this product", 404);
    }
    return transformedImages[0];
  }
  // Create a map of imageId to image for validation
  const imageMap = new Map(allImages.map((img) => [img.id, img]));
  // Validate all imageIds in imageOrders exist and belong to this product
  for (const order of props.body.imageOrders) {
    if (!imageMap.has(order.imageId)) {
      throw new HttpException(
        `Image ${order.imageId} not found or does not belong to this product`,
        400,
      );
    }
  }
  // Validate no duplicate displayOrder values
  const displayOrders = new Set<number>();
  for (const order of props.body.imageOrders) {
    if (displayOrders.has(order.newDisplayOrder)) {
      throw new HttpException(
        `Duplicate display order value: ${order.newDisplayOrder}`,
        400,
      );
    }
    displayOrders.add(order.newDisplayOrder);
  }
  // Step 4: Execute batch update in a transaction
  await MyGlobal.prisma.$transaction(
    props.body.imageOrders.map(
      (order: { imageId: string; newDisplayOrder: number }) =>
        MyGlobal.prisma.ecommerce_mall_product_images.update({
          where: { id: order.imageId },
          data: { display_order: order.newDisplayOrder },
        }),
    ),
  );
  // Step 5: Apply thumbnail selection if provided
  if (props.body.thumbnailImageId) {
    // Ensure the thumbnail image gets display_order = 1
    const thumbnailImg = imageMap.get(props.body.thumbnailImageId);
    if (thumbnailImg && thumbnailImg.display_order !== 1) {
      await MyGlobal.prisma.ecommerce_mall_product_images.update({
        where: { id: props.body.thumbnailImageId },
        data: { display_order: 1 },
      });
      // Find image that currently has display_order = 1 and move it to appropriate position
      // This handles the case where the selected thumbnail already has a different order
      const currentThumbnail = allImages.find(
        (img) =>
          img.display_order === 1 && img.id !== props.body.thumbnailImageId,
      );
      if (currentThumbnail) {
        // Find the next available display order position
        const nextOrder =
          Math.max(
            ...props.body.imageOrders.map(
              (o: { newDisplayOrder: number }) => o.newDisplayOrder,
            ),
          ) + 1;
        await MyGlobal.prisma.ecommerce_mall_product_images.update({
          where: { id: currentThumbnail.id },
          data: { display_order: nextOrder },
        });
      }
    }
  }
  // Step 6: Re-fetch images to get updated state
  const updatedImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      include: { product: true },
      orderBy: { display_order: "asc" },
    });
  // Step 7: Transform and return first image (ISummary is a single image, not a list)
  const transformedImages = await ArrayUtil.asyncMap(updatedImages, (img) =>
    EcommerceMallProductImageAtSummaryTransformer.transform(img),
  );
  if (transformedImages.length === 0) {
    throw new HttpException("No images found for this product", 404);
  }
  return transformedImages[0];
}
