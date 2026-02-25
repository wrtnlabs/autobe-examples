import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAdminSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
    select: {
      id: true,
      shop_name: true,
      shop_description: true,
      logo_image_url: true,
      approval_status: true,
      approval_date: true,
      created_at: true,
      updated_at: true,
    },
  });
  return {
    id: seller.id,
    shop_name: seller.shop_name,
    shop_description:
      seller.shop_description === null ? undefined : seller.shop_description,
    logo_image_url:
      seller.logo_image_url === null ? undefined : seller.logo_image_url,
    approval_status: seller.approval_status,
    approval_date:
      seller.approval_date === null ? null : seller.approval_date.toISOString(),
    created_at: seller.created_at.toISOString(),
    updated_at: seller.updated_at.toISOString(),
  };
}
