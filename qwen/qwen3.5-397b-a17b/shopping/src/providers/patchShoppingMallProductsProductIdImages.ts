import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IReorder;
}): Promise<IShoppingMallProductImage[]> {
  // Fetch product with seller ownership info
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_seller_id: true,
        shopping_category_id: true,
        name: true,
        description: true,
        base_price: true,
      },
    });
  // Fetch all active images for this product
  const activeImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
    });
  const activeImageIds = new Set(activeImages.map((img) => img.id));
  const requestedImageIds = new Set(props.body.imageIds);
  // Validate: no duplicates in request
  if (props.body.imageIds.length !== requestedImageIds.size) {
    throw new HttpException("Duplicate image IDs in request", 400);
  }
  // Validate: all requested images belong to this product and are active
  for (const imageId of props.body.imageIds) {
    if (!activeImageIds.has(imageId)) {
      throw new HttpException(
        `Image ${imageId} does not belong to this product or is deleted`,
        400,
      );
    }
  }
  // Validate: no missing active images
  for (const activeId of activeImageIds) {
    if (!requestedImageIds.has(activeId)) {
      throw new HttpException(
        `Missing active image ${activeId} in reorder request`,
        400,
      );
    }
  }
  // Create product snapshot BEFORE updating to preserve previous state
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_product_id: props.productId,
      shopping_mall_seller_id: product.shopping_seller_id,
      shopping_mall_category_id: product.shopping_category_id,
      name: product.name,
      description: product.description ?? "",
      base_price: product.base_price,
      snapshot_at: new Date(),
      created_at: new Date(),
    },
  });
  // Update display_order for each image based on array position
  const updatePromises = props.body.imageIds.map((imageId, index) =>
    MyGlobal.prisma.shopping_mall_product_images.update({
      where: { id: imageId },
      data: {
        display_order: index + 1,
        updated_at: new Date(),
      },
    }),
  );
  await Promise.all(updatePromises);
  // Fetch and return updated images
  const updatedImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      orderBy: { display_order: "asc" },
      ...ShoppingMallProductImageTransformer.select(),
    });
  return await ArrayUtil.asyncMap(
    updatedImages,
    ShoppingMallProductImageTransformer.transform,
  );
}
