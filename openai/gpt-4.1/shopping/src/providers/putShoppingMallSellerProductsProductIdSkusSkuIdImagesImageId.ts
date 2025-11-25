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

export async function putShoppingMallSellerProductsProductIdSkusSkuIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProductImage> {
  // 1. Fetch the product, validate seller ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }

  // 2. Fetch the SKU, validate it belongs to the product
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: props.skuId },
  });
  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }
  if (sku.shopping_mall_product_id !== props.productId) {
    throw new HttpException("SKU does not belong to the given product", 400);
  }

  // 3. Fetch the image, validate it is attached to the sku, not to another sku/product, and is not deleted
  const image = await MyGlobal.prisma.shopping_mall_product_images.findUnique({
    where: { id: props.imageId },
  });
  if (!image) {
    throw new HttpException("Image not found", 404);
  }
  if (image.deleted_at !== null) {
    throw new HttpException("This image has been deleted", 404);
  }
  if (image.shopping_mall_product_sku_id !== props.skuId) {
    throw new HttpException("Image is not attached to the specified SKU", 400);
  }
  if (
    image.shopping_mall_product_id !== null &&
    image.shopping_mall_product_id !== undefined
  ) {
    throw new HttpException("Image is not a SKU-level image", 400);
  }

  // 4. If position update is requested - ensure uniqueness per SKU
  if (
    typeof props.body.position === "number" &&
    props.body.position !== image.position
  ) {
    const count = await MyGlobal.prisma.shopping_mall_product_images.count({
      where: {
        shopping_mall_product_sku_id: props.skuId,
        position: props.body.position,
        deleted_at: null,
        NOT: { id: props.imageId },
      },
    });
    if (count > 0) {
      throw new HttpException("Position must be unique for the SKU", 409);
    }
  }

  // 5. Only allow updates to permitted fields
  const { position, alt_text, label } = props.body;

  const updated = await MyGlobal.prisma.shopping_mall_product_images.update({
    where: { id: props.imageId },
    data: {
      ...(typeof position === "number" ? { position } : {}),
      ...(alt_text !== undefined ? { alt_text } : {}),
      ...(label !== undefined ? { label } : {}),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id ?? undefined,
    shopping_mall_product_sku_id:
      updated.shopping_mall_product_sku_id ?? undefined,
    cdn_uri: updated.cdn_uri,
    alt_text: updated.alt_text ?? undefined,
    position: updated.position,
    label: updated.label ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
