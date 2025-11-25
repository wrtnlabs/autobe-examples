import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";

export async function getShoppingMallProductsProductIdSkusSkuIdImagesImageId(props: {
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductImage> {
  const image = await MyGlobal.prisma.shopping_mall_product_images.findFirst({
    where: {
      id: props.imageId,
      shopping_mall_product_id: props.productId,
      shopping_mall_product_sku_id: props.skuId,
      deleted_at: null,
    },
  });

  if (!image) {
    throw new HttpException(
      "Image not found for given product/SKU or has been deleted.",
      404,
    );
  }

  return {
    id: image.id,
    shopping_mall_product_id: image.shopping_mall_product_id ?? undefined,
    shopping_mall_product_sku_id:
      image.shopping_mall_product_sku_id ?? undefined,
    cdn_uri: image.cdn_uri,
    alt_text: image.alt_text ?? undefined,
    position: image.position,
    label: image.label ?? undefined,
    created_at: toISOStringSafe(image.created_at),
    updated_at: toISOStringSafe(image.updated_at),
    deleted_at:
      image.deleted_at === null ? null : toISOStringSafe(image.deleted_at),
  };
}
