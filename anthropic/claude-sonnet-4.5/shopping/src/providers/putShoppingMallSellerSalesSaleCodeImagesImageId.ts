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

export async function putShoppingMallSellerSalesSaleCodeImagesImageId(props: {
  seller: SellerPayload;
  saleCode: string;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleImage.IUpdate;
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

  const existingImage =
    await MyGlobal.prisma.shopping_mall_sale_images.findFirst({
      where: {
        id: props.imageId,
        shopping_mall_sale_id: sale.id,
      },
    });

  if (!existingImage) {
    throw new HttpException("Image not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_sale_images.update({
    where: { id: props.imageId },
    data: {
      ...(props.body.url_original !== undefined && {
        url_original: props.body.url_original,
      }),
      ...(props.body.url_large !== undefined && {
        url_large: props.body.url_large,
      }),
      ...(props.body.url_medium !== undefined && {
        url_medium: props.body.url_medium,
      }),
      ...(props.body.url_small !== undefined && {
        url_small: props.body.url_small,
      }),
      ...(props.body.url_thumbnail !== undefined && {
        url_thumbnail: props.body.url_thumbnail,
      }),
      ...(props.body.is_primary !== undefined && {
        is_primary: props.body.is_primary,
      }),
      ...(props.body.display_order !== undefined && {
        display_order: props.body.display_order,
      }),
      ...(props.body.alt_text !== undefined && {
        alt_text: props.body.alt_text,
      }),
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    shopping_mall_sale_id: updated.shopping_mall_sale_id as string &
      tags.Format<"uuid">,
    shopping_mall_sale_sku_id:
      updated.shopping_mall_sale_sku_id === null
        ? undefined
        : (updated.shopping_mall_sale_sku_id as
            | (string & tags.Format<"uuid">)
            | undefined),
    url_original: updated.url_original,
    url_large: updated.url_large,
    url_medium: updated.url_medium,
    url_small: updated.url_small,
    url_thumbnail: updated.url_thumbnail,
    is_primary: updated.is_primary,
    display_order: updated.display_order,
    alt_text:
      updated.alt_text === null || updated.alt_text === undefined
        ? undefined
        : updated.alt_text,
    created_at: toISOStringSafe(updated.created_at),
  };
}
