import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
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

export async function postShoppingMallSellerSaleImages(props: {
  seller: SellerPayload;
  body: IShoppingMallSaleImage.ICreate;
}): Promise<IShoppingMallSaleImage> {
  const { shopping_mall_sale_id, image_url, display_order, alt_text } =
    props.body as {
      shopping_mall_sale_id: string;
      image_url: string;
      display_order: number;
      alt_text?: string | null;
    };
  if (!shopping_mall_sale_id) {
    throw new HttpException("Missing shopping_mall_sale_id", 400);
  }
  try {
    new URL(image_url);
  } catch {
    throw new HttpException("Invalid image_url", 400);
  }
  if (!Number.isInteger(display_order) || display_order <= 0) {
    throw new HttpException("display_order must be a positive integer", 400);
  }
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      id: shopping_mall_sale_id,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!sale) {
    throw new HttpException("Sale not found or unauthorized", 404);
  }
  const existingImage =
    await MyGlobal.prisma.shopping_mall_sale_images.findFirst({
      where: {
        shopping_mall_sale_id: shopping_mall_sale_id,
        display_order: display_order,
        deleted_at: null,
      },
    });
  if (existingImage) {
    throw new HttpException("Display order already exists for this sale", 400);
  }
  const timestamp = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_sale_images.create({
    data: {
      id: v4(),
      shopping_mall_sale_id: shopping_mall_sale_id,
      image_url: image_url,
      display_order: display_order,
      alt_text: alt_text ?? null,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    shopping_mall_sale_id: created.shopping_mall_sale_id,
    image_url: created.image_url,
    display_order: created.display_order,
    alt_text: created.alt_text,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at,
  };
}
