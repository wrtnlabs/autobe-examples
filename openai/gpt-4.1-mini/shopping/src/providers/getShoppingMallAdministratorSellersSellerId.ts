import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function getShoppingMallAdministratorSellersSellerId(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
    select: {
      id: true,
      email: true,
      shop_name: true,
      shop_description: true,
      logo_uri: true,
      approval_status: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!seller) throw new HttpException("Seller not found", 404);
  return {
    id: seller.id,
    email: seller.email,
    shop_name: seller.shop_name,
    shop_description: seller.shop_description,
    logo_uri: seller.logo_uri,
    approval_status: seller.approval_status,
    rejection_reason:
      seller.rejection_reason === null ? null : seller.rejection_reason,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
  };
}
