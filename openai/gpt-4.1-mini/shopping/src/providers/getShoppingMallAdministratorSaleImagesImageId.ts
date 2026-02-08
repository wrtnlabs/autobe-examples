import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorSaleImagesImageId(props: {
  administrator: AdministratorPayload;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleImage> {
  const record = await MyGlobal.prisma.shopping_mall_sale_images.findUnique({
    where: { id: props.imageId },
    select: {
      id: true,
      shopping_mall_sale_id: true,
      image_url: true,
      display_order: true,
      alt_text: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (record === null) {
    throw new HttpException("Sale image not found", 404);
  }
  return {
    id: record.id,
    shopping_mall_sale_id: record.shopping_mall_sale_id,
    image_url: record.image_url,
    display_order: record.display_order,
    alt_text: record.alt_text === null ? undefined : record.alt_text,
    created_at: toISOStringSafe(record.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(record.updated_at) as string &
      tags.Format<"date-time">,
  };
}
