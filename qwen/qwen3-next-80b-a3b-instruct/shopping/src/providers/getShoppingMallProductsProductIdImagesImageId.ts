import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";

export async function getShoppingMallProductsProductIdImagesImageId(props: {
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductImage> {
  const image = await MyGlobal.prisma.shopping_mall_product_images.findUnique({
    where: {
      id: props.imageId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });

  if (!image) {
    throw new HttpException("Image not found", 404);
  }

  return {
    id: image.id,
    image_url: image.image_url,
    sort_order: image.sort_order,
    is_primary: image.is_primary,
    shopping_mall_product_id:
      image.shopping_mall_product_id !== null
        ? (image.shopping_mall_product_id satisfies string as string)
        : "",
    shopping_mall_product_variant_id:
      image.shopping_mall_product_variant_id !== null
        ? (image.shopping_mall_product_variant_id satisfies string as string)
        : "",
    alt_text:
      image.alt_text !== null
        ? (image.alt_text satisfies string as string)
        : "",
    created_at: toISOStringSafe(image.created_at),
    updated_at: toISOStringSafe(image.updated_at),
  };
}
