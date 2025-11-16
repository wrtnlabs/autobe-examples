import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";

export async function getShoppingMallSalesSaleCodeSkusSkuCodeImagesImageId(props: {
  saleCode: string;
  skuCode: string;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleImage> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { code: props.saleCode },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  const sku = await MyGlobal.prisma.shopping_mall_sale_skus.findFirst({
    where: {
      sku_code: props.skuCode,
      shopping_mall_sale_id: sale.id,
    },
  });

  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }

  const image = await MyGlobal.prisma.shopping_mall_sale_images.findUnique({
    where: { id: props.imageId },
  });

  if (!image) {
    throw new HttpException("Image not found", 404);
  }

  if (image.shopping_mall_sale_id !== sale.id) {
    throw new HttpException("Image does not belong to the specified sale", 404);
  }

  if (
    image.shopping_mall_sale_sku_id !== null &&
    image.shopping_mall_sale_sku_id !== sku.id
  ) {
    throw new HttpException("Image does not belong to the specified SKU", 404);
  }

  return {
    id: image.id,
    shopping_mall_sale_id: image.shopping_mall_sale_id,
    shopping_mall_sale_sku_id:
      image.shopping_mall_sale_sku_id === null
        ? undefined
        : image.shopping_mall_sale_sku_id,
    url_original: image.url_original,
    url_large: image.url_large,
    url_medium: image.url_medium,
    url_small: image.url_small,
    url_thumbnail: image.url_thumbnail,
    is_primary: image.is_primary,
    display_order: image.display_order,
    alt_text: image.alt_text,
    created_at: toISOStringSafe(image.created_at),
  };
}
