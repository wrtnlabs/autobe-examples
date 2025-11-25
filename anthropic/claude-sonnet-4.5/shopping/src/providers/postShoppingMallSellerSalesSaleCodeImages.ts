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

export async function postShoppingMallSellerSalesSaleCodeImages(props: {
  seller: SellerPayload;
  saleCode: string;
  body: IShoppingMallSaleImage.ICreate;
}): Promise<IShoppingMallSaleImage> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  if (sale.status === "archived") {
    throw new HttpException("Cannot add images to archived sale", 403);
  }

  if (props.body.shopping_mall_sale_sku_id) {
    const sku = await MyGlobal.prisma.shopping_mall_sale_skus.findFirst({
      where: {
        id: props.body.shopping_mall_sale_sku_id,
        shopping_mall_sale_id: sale.id,
      },
    });

    if (!sku) {
      throw new HttpException(
        "SKU not found or does not belong to this sale",
        404,
      );
    }
  }

  const created = await MyGlobal.prisma.shopping_mall_sale_images.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_sale_id: sale.id,
      shopping_mall_sale_sku_id: props.body.shopping_mall_sale_sku_id ?? null,
      url_original: props.body.url_original,
      url_large: props.body.url_large,
      url_medium: props.body.url_medium,
      url_small: props.body.url_small,
      url_thumbnail: props.body.url_thumbnail,
      is_primary: props.body.is_primary,
      display_order: props.body.display_order,
      alt_text: props.body.alt_text ?? null,
      created_at: new Date(),
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    shopping_mall_sale_id: created.shopping_mall_sale_id as string &
      tags.Format<"uuid">,
    shopping_mall_sale_sku_id:
      created.shopping_mall_sale_sku_id === null
        ? null
        : (created.shopping_mall_sale_sku_id as string & tags.Format<"uuid">),
    url_original: created.url_original,
    url_large: created.url_large,
    url_medium: created.url_medium,
    url_small: created.url_small,
    url_thumbnail: created.url_thumbnail,
    is_primary: created.is_primary,
    display_order: created.display_order,
    alt_text: created.alt_text,
    created_at: toISOStringSafe(created.created_at),
  };
}
