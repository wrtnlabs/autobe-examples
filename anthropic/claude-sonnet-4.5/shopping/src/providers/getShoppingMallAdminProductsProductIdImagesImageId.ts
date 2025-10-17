import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminProductsProductIdImagesImageId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductImage> {
  const { productId, imageId } = props;

  const image =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: imageId },
    });

  if (image.shopping_mall_product_id !== productId) {
    throw new HttpException(
      "Image does not belong to the specified product",
      404,
    );
  }

  return {
    id: image.id,
    shopping_mall_product_id: image.shopping_mall_product_id,
    shopping_mall_sku_id:
      image.shopping_mall_sku_id === null
        ? undefined
        : image.shopping_mall_sku_id,
    image_url: image.image_url,
    display_order: image.display_order,
    is_primary: image.is_primary,
    alt_text: image.alt_text === null ? undefined : image.alt_text,
    created_at: toISOStringSafe(image.created_at),
  };
}
