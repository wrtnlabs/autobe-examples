import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingSellerProductsProductCodeImagesImageId(props: {
  seller: SellerPayload;
  productCode: string;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingProductImage.IUpdate;
}): Promise<IShoppingProductImage> {
  // Find the product by code
  const product = await MyGlobal.prisma.shopping_products.findFirst({
    where: { code: props.productCode, deleted_at: null },
    select: { id: true, shopping_seller_id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_seller_id !== props.seller.id) {
    throw new HttpException(
      "Unauthorized: seller does not own this product",
      403,
    );
  }

  // Find the image row by ID
  const image = await MyGlobal.prisma.shopping_product_images.findFirst({
    where: { id: props.imageId },
    select: { id: true, shopping_product_id: true, created_at: true },
  });
  if (!image || image.shopping_product_id !== product.id) {
    throw new HttpException("Image not found for this product", 404);
  }

  // Business rule validations
  if (props.body.image_uri !== undefined && props.body.image_uri !== null) {
    const uri = props.body.image_uri.trim();
    const lowered = uri.toLowerCase();
    if (
      !(
        lowered.endsWith(".jpg") ||
        lowered.endsWith(".jpeg") ||
        lowered.endsWith(".png")
      )
    ) {
      throw new HttpException("Only JPEG/PNG image URIs are allowed", 400);
    }
    // Size validation expected at file upload step; only extension check here as per API
  }
  if (
    props.body.order_index !== undefined &&
    (typeof props.body.order_index !== "number" ||
      !Number.isInteger(props.body.order_index) ||
      props.body.order_index < -2147483648 ||
      props.body.order_index > 2147483647)
  ) {
    throw new HttpException("order_index must be a 32-bit integer", 400);
  }

  // Update image
  const updated = await MyGlobal.prisma.shopping_product_images.update({
    where: { id: props.imageId },
    data: {
      ...(props.body.image_uri !== undefined && {
        image_uri: props.body.image_uri,
      }),
      ...(props.body.order_index !== undefined && {
        order_index: props.body.order_index,
      }),
      // No deletion or change of other fields
    },
    select: {
      id: true,
      shopping_product_id: true,
      image_uri: true,
      order_index: true,
      created_at: true,
    },
  });

  // Return DTO
  return {
    id: updated.id,
    shopping_product_id: updated.shopping_product_id,
    image_uri: updated.image_uri,
    order_index:
      updated.order_index !== null && updated.order_index !== undefined
        ? updated.order_index
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
  };
}
