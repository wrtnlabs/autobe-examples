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
  body: IEcommerceMallProductImage.IUpdate;
}): Promise<IEcommerceMallProductImage.ISummary> {
  // Verify product exists
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Validate that at least one field is provided for update
  if (
    props.body.imageUrl === undefined &&
    props.body.displayOrder === undefined
  ) {
    throw new HttpException(
      "At least one of imageUrl or displayOrder must be provided",
      400,
    );
  }
  // Get all active images for the product
  const existingImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      orderBy: { display_order: "asc" },
    });
  if (existingImages.length === 0) {
    throw new HttpException("Product has no images to update", 400);
  }
  // Without an imageId in the request, we cannot identify which specific image to update
  // The DTO structure appears incomplete for this operation
  // We'll interpret this as updating the first image in the sequence
  const targetImage = existingImages[0];
  // Handle display order reordering if specified
  if (props.body.displayOrder !== undefined) {
    const newDisplayOrder = props.body.displayOrder;
    const currentDisplayOrder = targetImage.display_order;
    // Check if the target display order is already occupied
    const imageAtTargetPosition = existingImages.find(
      (img) =>
        img.display_order === newDisplayOrder && img.id !== targetImage.id,
    );
    if (imageAtTargetPosition) {
      // Swap display orders between the two images
      await MyGlobal.prisma.$transaction([
        MyGlobal.prisma.ecommerce_mall_product_images.update({
          where: { id: imageAtTargetPosition.id },
          data: {
            display_order: currentDisplayOrder,
            updated_at: new Date(),
          },
        }),
        MyGlobal.prisma.ecommerce_mall_product_images.update({
          where: { id: targetImage.id },
          data: {
            display_order: newDisplayOrder,
            updated_at: new Date(),
          },
        }),
      ]);
    } else {
      // Simply update the display order
      await MyGlobal.prisma.ecommerce_mall_product_images.update({
        where: { id: targetImage.id },
        data: {
          display_order: newDisplayOrder,
          updated_at: new Date(),
        },
      });
    }
  }
  // Handle imageUrl update if specified
  if (props.body.imageUrl !== undefined) {
    await MyGlobal.prisma.ecommerce_mall_product_images.update({
      where: { id: targetImage.id },
      data: {
        image_url: props.body.imageUrl,
        updated_at: new Date(),
      },
    });
  }
  // Fetch and return the updated image
  const updatedImage =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: { id: targetImage.id },
      ...EcommerceMallProductImageAtSummaryTransformer.select(),
    });
  return await EcommerceMallProductImageAtSummaryTransformer.transform(
    updatedImage,
  );
}
