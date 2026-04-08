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

export async function deleteEcommerceSellerProductsProductIdImagesImageId(props: {
  seller: {
    id: string & import("typia").tags.Format<"uuid">;

    session_id: string & import("typia").tags.Format<"uuid">;

    type: "seller";
  };
  productId: string & import("typia").tags.Format<"uuid">;

  imageId: string & import("typia").tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify product exists and is not deleted
  const product = await MyGlobal.prisma.ecommerce_products.findUnique({
    where: { id: props.productId },
    select: { id: true, seller_id: true, deleted_at: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product already deleted", 400);
  }
  // 2. Verify seller owns the product
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify image exists, belongs to product, and is not already deleted
  const image = await MyGlobal.prisma.ecommerce_product_images.findUnique({
    where: { id: props.imageId },
    select: {
      id: true,
      ecommerce_product_id: true,
      display_order: true,
      deleted_at: true,
    },
  });
  if (image === null) {
    throw new HttpException("Image not found", 404);
  }
  if (image.ecommerce_product_id !== props.productId) {
    throw new HttpException("Image not found", 404);
  }
  if (image.deleted_at !== null) {
    throw new HttpException("Image already deleted", 400);
  }
  // 4. Count remaining non-deleted images - reject if <= 1 (minimum image requirement)
  const imageCount = await MyGlobal.prisma.ecommerce_product_images.count({
    where: {
      ecommerce_product_id: props.productId,
      deleted_at: null,
    },
  });
  if (imageCount <= 1) {
    throw new HttpException(
      "Cannot delete last image - product must have at least one image",
      400,
    );
  }
  // 5. Soft delete the image (new Date() for Prisma DateTime field - internal only)
  await MyGlobal.prisma.ecommerce_product_images.update({
    where: { id: props.imageId },
    data: { deleted_at: new Date() },
  });
  // 6. If deleted image was thumbnail (display_order = 0), promote next image
  if (image.display_order === 0) {
    const nextImage = await MyGlobal.prisma.ecommerce_product_images.findFirst({
      where: {
        ecommerce_product_id: props.productId,
        deleted_at: null,
        display_order: { gt: 0 },
      },
      orderBy: { display_order: "asc" },
      select: { id: true, display_order: true },
    });
    if (nextImage !== null) {
      await MyGlobal.prisma.ecommerce_product_images.update({
        where: { id: nextImage.id },
        data: { display_order: 0 },
      });
    }
  }
}
