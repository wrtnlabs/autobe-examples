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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IReorderRequest;
}): Promise<IShoppingMallProductImage> {
  // Verify product exists and seller owns it
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, shopping_mall_seller_id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }
  // Query existing images for the product
  const existingImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        display_order: true,
      },
    });
  // Validate all image IDs in request belong to this product
  const existingImageIds = new Set(existingImages.map((img) => img.id));
  const requestedImageIds = new Set(
    props.body.images.map((item) => item.imageId),
  );
  for (const imageId of requestedImageIds) {
    if (!existingImageIds.has(imageId)) {
      throw new HttpException(
        `Image ${imageId} does not belong to this product`,
        400,
      );
    }
  }
  // Validate all existing images are included in the reorder request
  if (existingImageIds.size !== requestedImageIds.size) {
    throw new HttpException(
      "All product images must be included in the reorder request",
      400,
    );
  }
  // Validate display_order values are consecutive integers starting from 0
  const displayOrders = props.body.images
    .map((item) => item.displayOrder)
    .sort((a, b) => a - b);
  for (let i = 0; i < displayOrders.length; i++) {
    if (displayOrders[i] !== i) {
      throw new HttpException(
        "Display order values must be consecutive integers starting from 0",
        400,
      );
    }
  }
  // Validate no duplicate image IDs or display orders
  const uniqueImageIds = new Set(props.body.images.map((item) => item.imageId));
  if (uniqueImageIds.size !== props.body.images.length) {
    throw new HttpException("Duplicate image IDs in reorder request", 400);
  }
  const uniqueDisplayOrders = new Set(
    props.body.images.map((item) => item.displayOrder),
  );
  if (uniqueDisplayOrders.size !== props.body.images.length) {
    throw new HttpException(
      "Duplicate display order values in reorder request",
      400,
    );
  }
  // Update all images in a transaction
  await MyGlobal.prisma.$transaction(
    props.body.images.map((item) =>
      MyGlobal.prisma.shopping_mall_product_images.update({
        where: { id: item.imageId },
        data: {
          display_order: item.displayOrder,
          updated_at: new Date(),
        },
      }),
    ),
  );
  // Query and return the first image (new thumbnail)
  const updated =
    await MyGlobal.prisma.shopping_mall_product_images.findFirstOrThrow({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      orderBy: { display_order: "asc" },
      ...ShoppingMallProductImageTransformer.select(),
    });
  return await ShoppingMallProductImageTransformer.transform(updated);
}
