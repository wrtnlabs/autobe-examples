import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductImageAtInvertTransformer } from "../transformers/EcommerceMallProductImageAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductIdImagesReorder(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.IReorder;
}): Promise<IEcommerceMallProductImage.IInvert> {
  // 1. Verify product exists and seller owns it
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
      },
    });
  // 2. Authorization check - only product owner can reorder images
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Extract imageId -> newPosition mappings
  const reorderMappings = Object.entries(props.body) as Array<
    [string, number & tags.Type<"int32"> & tags.Minimum<0>]
  >;
  if (reorderMappings.length === 0) {
    throw new HttpException("Reorder body cannot be empty", 400);
  }
  const imageIds = reorderMappings.map(([imageId]) => imageId);
  // 4. Validate all target positions are valid (non-negative integers)
  for (const [imageId, newPosition] of reorderMappings) {
    if (newPosition < 0 || !Number.isInteger(newPosition)) {
      throw new HttpException(
        `Invalid position for image ${imageId}: must be a non-negative integer`,
        400,
      );
    }
  }
  // 5. Validate no duplicate target positions
  const targetPositions = reorderMappings.map(([, position]) => position);
  const uniquePositions = new Set(targetPositions);
  if (uniquePositions.size !== targetPositions.length) {
    throw new HttpException("Duplicate target positions are not allowed", 400);
  }
  // 6. Verify all imageIds belong to this product
  const existingImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId,
      },
      select: {
        id: true,
        display_order: true,
      },
    });
  const existingImageIds = new Set(existingImages.map((img) => img.id));
  for (const imageId of imageIds) {
    if (!existingImageIds.has(imageId)) {
      throw new HttpException(
        `Image ${imageId} does not belong to product ${props.productId}`,
        400,
      );
    }
  }
  // 7. Get total image count and validate target positions within range
  const totalImages = existingImages.length;
  const maxPosition = totalImages - 1;
  for (const [, newPosition] of reorderMappings) {
    if (newPosition > maxPosition) {
      throw new HttpException(
        `Invalid position ${newPosition}: must be between 0 and ${maxPosition}`,
        400,
      );
    }
  }
  // 8. Execute atomic transaction to reorder
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Map of imageId -> newPosition
    const positionMap = new Map(reorderMappings);
    // Update each image to its new position
    const updatePromises = reorderMappings.map(([imageId, newPosition]) =>
      tx.ecommerce_mall_product_images.update({
        where: { id: imageId },
        data: {
          display_order: newPosition,
          updated_at: new Date(),
        },
      }),
    );
    await Promise.all(updatePromises);
  });
  // 9. Return the image at position 0 (the new main thumbnail)
  const mainImage =
    await MyGlobal.prisma.ecommerce_mall_product_images.findFirstOrThrow({
      where: { product_id: props.productId },
      orderBy: { display_order: "asc" },
      ...EcommerceMallProductImageAtInvertTransformer.select(),
    });
  return EcommerceMallProductImageAtInvertTransformer.transform(mainImage);
}
