import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerSalesSaleCodeSkusSkuCodeImagesImageId(props: {
  seller: SellerPayload;
  saleCode: string;
  skuCode: string;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleImage> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException("Sale not found or access denied", 404);
  }

  const sku = await MyGlobal.prisma.shopping_mall_sale_skus.findFirst({
    where: {
      shopping_mall_sale_id: sale.id,
      sku_code: props.skuCode,
    },
  });

  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }

  const image = await MyGlobal.prisma.shopping_mall_sale_images.findFirst({
    where: {
      id: props.imageId,
      shopping_mall_sale_id: sale.id,
      shopping_mall_sale_sku_id: sku.id,
    },
  });

  if (!image) {
    throw new HttpException("Image not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_sale_images.delete({
    where: {
      id: props.imageId,
    },
  });

  return {
    id: image.id,
    shopping_mall_sale_id: image.shopping_mall_sale_id,
    shopping_mall_sale_sku_id: image.shopping_mall_sale_sku_id,
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
