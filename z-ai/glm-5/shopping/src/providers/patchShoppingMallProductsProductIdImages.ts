import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdImages(props: {
  productId: string;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProductImage> {
  // Verify product exists and is not deleted
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, deleted_at: true },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Get all images for this product to handle conflict resolution
  const allImages = await MyGlobal.prisma.shopping_mall_product_images.findMany(
    {
      where: { shopping_mall_product_id: props.productId },
      orderBy: { display_order: "asc" },
      select: { id: true, display_order: true },
    },
  );
  // Use transaction for atomic updates
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Find the image to update (by id if provided, otherwise find first)
    const imageId = props.body.id;
    if (!imageId) {
      throw new HttpException("Image ID is required", 400);
    }
    const targetImage = allImages.find((img) => img.id === imageId);
    if (!targetImage) {
      throw new HttpException(
        "Image not found or does not belong to product",
        400,
      );
    }
    const newDisplayOrder =
      props.body.display_order ?? targetImage.display_order;
    // If display_order is being changed, resolve conflicts by shifting other images
    if (props.body.display_order !== undefined) {
      const currentOrder = targetImage.display_order;
      const targetOrder = props.body.display_order;
      if (currentOrder !== targetOrder) {
        // Shift images to make room or compact
        for (const img of allImages) {
          if (img.id === imageId) continue;
          // When moving to a lower position, shift images between target and current up
          // When moving to a higher position, shift images between current and target down
          if (targetOrder < currentOrder) {
            // Moving to earlier position: shift images from targetOrder to currentOrder-1 up by 1
            if (
              img.display_order >= targetOrder &&
              img.display_order < currentOrder
            ) {
              await tx.shopping_mall_product_images.update({
                where: { id: img.id },
                data: { display_order: img.display_order + 1 },
              });
            }
          } else {
            // Moving to later position: shift images from currentOrder+1 to targetOrder down by 1
            if (
              img.display_order > currentOrder &&
              img.display_order <= targetOrder
            ) {
              await tx.shopping_mall_product_images.update({
                where: { id: img.id },
                data: { display_order: img.display_order - 1 },
              });
            }
          }
        }
      }
    }
    // Update the target image
    await tx.shopping_mall_product_images.update({
      where: { id: imageId },
      data: {
        ...(props.body.image_url !== undefined && {
          image_url: props.body.image_url,
        }),
        ...(props.body.display_order !== undefined && {
          display_order: newDisplayOrder,
        }),
      },
    });
    // Compact display_order to remove any gaps (sequential from 0)
    const updatedImages = await tx.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: props.productId },
      orderBy: { display_order: "asc" },
      select: { id: true, display_order: true },
    });
    for (let i = 0; i < updatedImages.length; i++) {
      if (updatedImages[i].display_order !== i) {
        await tx.shopping_mall_product_images.update({
          where: { id: updatedImages[i].id },
          data: { display_order: i },
        });
      }
    }
  });
  // Return the updated image
  const result =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: props.body.id! },
      ...ShoppingMallProductImageTransformer.select(),
    });
  return await ShoppingMallProductImageTransformer.transform(result);
}
