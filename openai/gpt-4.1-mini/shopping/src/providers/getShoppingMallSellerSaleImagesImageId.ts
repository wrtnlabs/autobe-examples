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

export async function getShoppingMallSellerSaleImagesImageId(props: {
  seller: SellerPayload;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleImage> {
  const saleImage = await MyGlobal.prisma.shopping_mall_sale_images.findUnique({
    where: { id: props.imageId },
    select: {
      id: true,
      shopping_mall_sale_id: true,
      image_url: true,
      display_order: true,
      alt_text: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!saleImage || saleImage.deleted_at !== null) {
    throw new HttpException("Sale image not found", 404);
  }
  return {
    id: saleImage.id,
    shopping_mall_sale_id: saleImage.shopping_mall_sale_id,
    image_url: saleImage.image_url,
    display_order: saleImage.display_order,
    alt_text: saleImage.alt_text === undefined ? null : saleImage.alt_text,
    created_at: saleImage.created_at as unknown as string &
      tags.Format<"date-time">,
    updated_at: saleImage.updated_at as unknown as string &
      tags.Format<"date-time">,
  };
}
