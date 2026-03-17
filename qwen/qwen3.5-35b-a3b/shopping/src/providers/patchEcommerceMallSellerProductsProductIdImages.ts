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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.IUpdate;
}): Promise<IEcommerceMallProductImage.ISummary> {
  // Verify product exists and seller owns it
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true, deleted_at: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Find the primary image (display_order = 0) or first image to update
  const targetImage =
    await MyGlobal.prisma.ecommerce_mall_product_images.findFirst({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      orderBy: { display_order: "asc" },
      select: {
        id: true,
        product_id: true,
        image_url: true,
        display_order: true,
        alt_text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (targetImage === null) {
    throw new HttpException("No images found for product", 404);
  }
  // Validate display_order if provided
  if (props.body.display_order !== undefined && props.body.display_order < 0) {
    throw new HttpException("Display order must be non-negative", 400);
  }
  // Update the target image
  const updatedImage =
    await MyGlobal.prisma.ecommerce_mall_product_images.update({
      where: { id: targetImage.id, product_id: props.productId },
      data: {
        ...(props.body.image_url !== undefined && {
          image_url: props.body.image_url,
        }),
        ...(props.body.display_order !== undefined && {
          display_order: props.body.display_order,
        }),
        ...(props.body.alt_text !== undefined && {
          alt_text: props.body.alt_text,
        }),
        updated_at: new Date(),
      },
      select: {
        id: true,
        product_id: true,
        image_url: true,
        display_order: true,
        alt_text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: updatedImage.id,
    image_url: updatedImage.image_url,
    display_order: updatedImage.display_order,
    alt_text: updatedImage.alt_text ?? undefined,
    created_at: toISOStringSafe(updatedImage.created_at),
    updated_at: toISOStringSafe(updatedImage.updated_at),
    deleted_at:
      updatedImage.deleted_at !== null
        ? toISOStringSafe(updatedImage.deleted_at)
        : null,
  };
}
