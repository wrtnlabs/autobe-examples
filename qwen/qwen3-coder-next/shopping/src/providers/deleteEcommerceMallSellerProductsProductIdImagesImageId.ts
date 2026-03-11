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
  // 1. Verify image exists and belongs to product and seller
  const image = await MyGlobal.prisma.ecommerce_mall_product_images.findFirst({
    where: {
      id: props.imageId,
      product_id: props.productId,
      deleted_at: null,
    },
  });
  if (image === null) {
    throw new HttpException("Product image not found", 404);
  }
  // 2. Verify seller owns the product
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found or access denied", 403);
  }
  // 3. Count remaining images to ensure at least one remains after deletion
  const remainingCount =
    await MyGlobal.prisma.ecommerce_mall_product_images.count({
      where: {
        product_id: props.productId,
        deleted_at: null,
        id: { not: props.imageId },
      },
    });
  if (remainingCount === 0) {
    throw new HttpException("At least one image must remain", 400);
  }
  // 4. Mark image as deleted (soft delete)
  await MyGlobal.prisma.ecommerce_mall_product_images.update({
    where: { id: props.imageId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 5. Reorder remaining images
  // If deleted image was main, promote next image to main
  if (image.is_main) {
    const nextMain =
      await MyGlobal.prisma.ecommerce_mall_product_images.findFirst({
        where: {
          product_id: props.productId,
          deleted_at: null,
          id: { not: props.imageId },
        },
        orderBy: { sort_order: "asc" },
      });
    if (nextMain !== null) {
      await MyGlobal.prisma.ecommerce_mall_product_images.update({
        where: { id: nextMain.id },
        data: {
          is_main: true,
          updated_at: new Date(),
        },
      });
    }
  }
  // Decrement sort_order for images with higher sort_order
  await MyGlobal.prisma.ecommerce_mall_product_images.updateMany({
    where: {
      product_id: props.productId,
      deleted_at: null,
      sort_order: { gt: image.sort_order },
    },
    data: {
      sort_order: { decrement: 1 },
      updated_at: new Date(),
    },
  });
}
