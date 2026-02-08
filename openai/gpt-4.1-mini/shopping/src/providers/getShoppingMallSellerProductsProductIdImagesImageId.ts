import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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

export async function getShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductImage> {
  const image = await MyGlobal.prisma.shopping_mall_product_images.findFirst({
    where: {
      id: props.imageId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_product_id: true,
      image_url: true,
      display_order: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (image === null) {
    throw new HttpException("Image not found", 404);
  }
  function toISOStringSafe(
    date: Date | null,
  ): (string & tags.Format<"date-time">) | null {
    if (date === null) return null;
    return date.toISOString() as string & tags.Format<"date-time">;
  }
  return {
    id: image.id,
    shopping_mall_product_id: image.shopping_mall_product_id,
    image_url: image.image_url,
    display_order: image.display_order,
    created_at: toISOStringSafe(image.created_at),
    updated_at: toISOStringSafe(image.updated_at),
    deleted_at: toISOStringSafe(image.deleted_at),
  };
}
