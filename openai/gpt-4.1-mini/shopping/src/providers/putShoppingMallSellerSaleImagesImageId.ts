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

export async function putShoppingMallSellerSaleImagesImageId(props: {
  seller: SellerPayload;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleImage.IUpdate;
}): Promise<IShoppingMallSaleImage> {
  const saleImage = await MyGlobal.prisma.shopping_mall_sale_images.findUnique({
    where: { id: props.imageId },
  });
  if (!saleImage) throw new HttpException("Sale image not found", 404);
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  let imageUrl = saleImage.image_url;
  if ("image_url" in props.body) imageUrl = (props.body as any).image_url;
  let displayOrder = saleImage.display_order;
  if ("display_order" in props.body)
    displayOrder = (props.body as any).display_order;
  let altText: string | null = saleImage.alt_text;
  if ("alt_text" in props.body) altText = (props.body as any).alt_text;
  const updated = await MyGlobal.prisma.shopping_mall_sale_images.update({
    where: { id: props.imageId },
    data: {
      image_url: imageUrl,
      display_order: displayOrder,
      alt_text: altText,
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    shopping_mall_sale_id: updated.shopping_mall_sale_id,
    image_url: updated.image_url,
    display_order: updated.display_order,
    alt_text: updated.alt_text === null ? null : (updated.alt_text ?? null),
    created_at: toISOStringSafe(updated.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updated.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : (toISOStringSafe(updated.deleted_at as Date) as
            | (string & tags.Format<"date-time">)
            | undefined),
  };
}
