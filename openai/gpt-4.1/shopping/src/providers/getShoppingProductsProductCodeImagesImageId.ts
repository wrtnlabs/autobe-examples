import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";

export async function getShoppingProductsProductCodeImagesImageId(props: {
  productCode: string;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingProductImage> {
  // Step 1: Lookup product by code (must be active/published)
  const product = await MyGlobal.prisma.shopping_products.findFirst({
    where: {
      code: props.productCode,
      status: {
        in: ["active", "published"], // Only public visible products
      },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found or not accessible", 404);
  }

  // Step 2: Lookup image by product id and imageId
  const image = await MyGlobal.prisma.shopping_product_images.findFirst({
    where: {
      id: props.imageId,
      shopping_product_id: product.id,
    },
  });
  if (!image) {
    throw new HttpException("Product image not found", 404);
  }

  // Step 3: Map result to IShoppingProductImage DTO
  return {
    id: image.id,
    shopping_product_id: image.shopping_product_id,
    image_uri: image.image_uri,
    order_index: image.order_index ?? undefined,
    created_at: toISOStringSafe(image.created_at),
  };
}
