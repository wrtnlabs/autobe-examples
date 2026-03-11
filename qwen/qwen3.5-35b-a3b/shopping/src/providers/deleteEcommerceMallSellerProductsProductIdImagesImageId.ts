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
  // Step 1: Verify product exists and seller owns it
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  // Step 2: Verify image exists and belongs to this product
  const image = await MyGlobal.prisma.ecommerce_mall_product_images.findFirst({
    where: {
      id: props.imageId,
      product_id: props.productId,
    },
  });
  if (image === null) {
    throw new HttpException("Image not found", 404);
  }
  // Step 3: Count active images for this product
  const activeImageCount =
    await MyGlobal.prisma.ecommerce_mall_product_images.count({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
    });
  // Step 4: Prevent deletion of last image
  if (activeImageCount === 1) {
    throw new HttpException("Cannot delete the last remaining image", 400);
  }
  // Step 5: Get all active images for resequencing (before deletion)
  const activeImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      orderBy: {
        display_order: "asc",
      },
    });
  // Step 6: Delete the image (soft delete)
  await MyGlobal.prisma.ecommerce_mall_product_images.update({
    where: { id: props.imageId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Step 7: Resequence display_order of remaining active images
  const remainingImages = activeImages.filter(
    (img) => img.id !== props.imageId,
  );
  for (const [index, img] of remainingImages.entries()) {
    await MyGlobal.prisma.ecommerce_mall_product_images.update({
      where: { id: img.id },
      data: {
        display_order: index,
        updated_at: new Date(),
      },
    });
  }
  // Step 8: Create product snapshot
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      product_id: props.productId,
      category_id: product.category_id,
      seller_id: product.seller_id,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      is_active: product.is_active,
      created_at: new Date(),
    },
  });
}
