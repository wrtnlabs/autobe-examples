import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerSalesSaleCodeImagesImageId(props: {
  seller: SellerPayload;
  saleCode: string;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleImage> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  if (sale.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  const image = await MyGlobal.prisma.shopping_mall_sale_images.findUnique({
    where: {
      id: props.imageId,
    },
  });

  if (!image) {
    throw new HttpException("Image not found", 404);
  }

  if (image.shopping_mall_sale_id !== sale.id) {
    throw new HttpException("Image does not belong to this sale", 404);
  }

  const deleted = await MyGlobal.prisma.shopping_mall_sale_images.delete({
    where: {
      id: props.imageId,
    },
  });

  return {
    id: deleted.id,
    shopping_mall_sale_id: deleted.shopping_mall_sale_id,
    shopping_mall_sale_sku_id:
      deleted.shopping_mall_sale_sku_id === null
        ? undefined
        : deleted.shopping_mall_sale_sku_id,
    url_original: deleted.url_original,
    url_large: deleted.url_large,
    url_medium: deleted.url_medium,
    url_small: deleted.url_small,
    url_thumbnail: deleted.url_thumbnail,
    is_primary: deleted.is_primary,
    display_order: deleted.display_order,
    alt_text: deleted.alt_text === null ? undefined : deleted.alt_text,
    created_at: toISOStringSafe(deleted.created_at),
  };
}
