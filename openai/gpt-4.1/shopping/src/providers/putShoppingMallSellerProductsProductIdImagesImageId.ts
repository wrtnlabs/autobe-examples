import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProductImage> {
  // Find the image record by ID and product
  const image = await MyGlobal.prisma.shopping_mall_product_images.findFirst({
    where: {
      id: props.imageId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });
  if (!image) {
    throw new HttpException("Product image not found for this product.", 404);
  }
  // Enforce image is not associated with a SKU (product update only)
  if (image.shopping_mall_product_sku_id !== null) {
    throw new HttpException("This image is not a product-level image.", 400);
  }
  // Find the product and check ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found.", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: Not your product.", 403);
  }
  // If updating position, enforce uniqueness among product images
  let updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if ("position" in props.body && typeof props.body.position === "number") {
    // Check for duplicate position
    const samePositionImage =
      await MyGlobal.prisma.shopping_mall_product_images.findFirst({
        where: {
          id: { not: image.id },
          shopping_mall_product_id: props.productId,
          position: props.body.position,
          deleted_at: null,
        },
      });
    if (samePositionImage) {
      throw new HttpException(
        "Another image already exists at the requested position for this product.",
        409,
      );
    }
    updateData.position = props.body.position;
  }
  if ("alt_text" in props.body) {
    updateData.alt_text =
      props.body.alt_text === undefined ? null : props.body.alt_text;
  }
  if ("label" in props.body) {
    updateData.label = props.body.label === undefined ? null : props.body.label;
  }
  const updated = await MyGlobal.prisma.shopping_mall_product_images.update({
    where: { id: props.imageId },
    data: updateData,
  });
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id ?? null,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id ?? null,
    cdn_uri: updated.cdn_uri,
    alt_text: updated.alt_text ?? null,
    position: updated.position,
    label: updated.label ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
