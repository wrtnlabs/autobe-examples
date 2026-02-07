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

export async function deleteShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string;
  imageId: string;
}): Promise<void> {
  // Validate product exists and is active (deleted_at IS NULL)
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Validate image exists and belongs to the specified product
  const image = await MyGlobal.prisma.shopping_mall_product_images.findUnique({
    where: {
      id: props.imageId,
      shopping_mall_product_id: props.productId,
    },
  });
  if (!image) {
    throw new HttpException("Image not found", 404);
  }
  // Delete the association between image and product
  await MyGlobal.prisma.shopping_mall_product_images.update({
    where: { id: props.imageId },
    data: {
      shopping_mall_product_id: undefined,
    },
  });
  // No body to return - 204 No Content by specification
  return;
}
