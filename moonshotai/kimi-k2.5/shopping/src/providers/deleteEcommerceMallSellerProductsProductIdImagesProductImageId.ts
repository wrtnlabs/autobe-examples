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

export async function deleteEcommerceMallSellerProductsProductIdImagesProductImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  productImageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify product exists and check ownership
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  // Authorization: seller must own the product
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify image exists and belongs to this product
  const image =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: {
        id: props.productImageId,
        deleted_at: null,
      },
      select: { id: true, product_id: true, display_order: true },
    });
  if (image.product_id !== props.productId) {
    throw new HttpException("Image does not belong to this product", 400);
  }
  // Soft delete the image
  const now = new Date();
  await MyGlobal.prisma.ecommerce_mall_product_images.update({
    where: { id: props.productImageId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Fetch remaining active images ordered by current display_order
  const remainingImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      orderBy: { display_order: "asc" },
      select: { id: true, display_order: true },
    });
  // Reorder remaining images sequentially using updateMany where possible
  // But since we need sequential ordering, we update one by one
  for (let i = 0; i < remainingImages.length; i++) {
    const img = remainingImages[i];
    if (img.display_order !== i) {
      await MyGlobal.prisma.ecommerce_mall_product_images.update({
        where: { id: img.id },
        data: {
          display_order: i,
          updated_at: now,
        },
      });
    }
  }
}
