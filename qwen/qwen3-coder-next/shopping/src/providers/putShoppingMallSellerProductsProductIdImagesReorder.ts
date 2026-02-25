import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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

export async function putShoppingMallSellerProductsProductIdImagesReorder(props: {
  seller: SellerPayload;
  productId: string;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProductImage.ISummary> {
  // Find all images for the product
  const existingImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        shopping_mall_seller_id: props.seller.id,
      },
    });
  if (existingImages.length === 0) {
    throw new HttpException("Product not found or no images available", 404);
  }
  // Create map for quick lookup
  const imageMap = new Map(existingImages.map((img) => [img.id, img]));
  // Validate all request image_ids exist for this product
  const imageIds = Array.isArray(props.body.image_id)
    ? props.body.image_id
    : [props.body.image_id];
  const requestIds = new Set(imageIds);
  for (const image of existingImages) {
    if (!requestIds.has(image.id)) {
      throw new HttpException(
        `Image ${image.id} not included in reorder request`,
        400,
      );
    }
  }
  // Update sort_order in transaction
  const updatedImages = await MyGlobal.prisma.$transaction(
    imageIds.map((id: string, index: number) =>
      MyGlobal.prisma.shopping_mall_product_images.update({
        where: { id },
        data: { sort_order: index },
      }),
    ),
  );
  // Create product snapshot after reordering
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
    });
  const snapshotVersion =
    (await MyGlobal.prisma.shopping_mall_product_snapshots.count({
      where: { shopping_mall_product_id: props.productId },
    })) + 1;
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_product_id: product.id,
      shopping_mall_seller_id: product.shopping_mall_seller_id,
      shopping_mall_category_id: product.shopping_mall_category_id,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      is_deleted: product.is_deleted,
      deleted_at: product.deleted_at,
      snapshot_timestamp: toISOStringSafe(new Date()),
      snapshot_version: snapshotVersion,
    },
  });
  // Return updated images as ISummary type - use the first image to create the summary
  // If no images found, throw error
  if (updatedImages.length === 0) {
    throw new HttpException("No images found after reorder", 404);
  }
  const firstImage = updatedImages[0];
  const result: IShoppingMallProductImage.ISummary = {
    id: firstImage.id,
    image_url: firstImage.image_url,
    sort_order: firstImage.sort_order,
  };
  return result;
}
