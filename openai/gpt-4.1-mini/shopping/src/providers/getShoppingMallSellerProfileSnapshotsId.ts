import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProfileSnapshotsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerProfileSnapshot> {
  const record =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findUnique({
      where: { id: props.id },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        shop_name: true,
        shop_description: true,
        logo_image_url: true,
        created_at: true,
      },
    });
  if (!record)
    throw new HttpException("Seller profile snapshot not found", 404);
  return {
    id: record.id,
    shopping_mall_seller_id: record.shopping_mall_seller_id,
    shop_name: record.shop_name,
    shop_description: record.shop_description,
    logo_image_url:
      record.logo_image_url === null ? null : record.logo_image_url,
    created_at: toISOStringSafe(record.created_at),
  };
}
