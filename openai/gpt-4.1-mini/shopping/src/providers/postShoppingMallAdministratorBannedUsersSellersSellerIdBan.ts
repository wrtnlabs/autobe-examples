import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
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

export async function postShoppingMallAdministratorBannedUsersSellersSellerIdBan(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  body: string; // changed from IShoppingMallBannedUser.IBanCreate to string for ban reason
}): Promise<IShoppingMallBannedUser> {
  // Check if the seller is already banned
  const existingBan =
    await MyGlobal.prisma.shopping_mall_banned_users.findUnique({
      where: { shopping_mall_seller_id: props.sellerId },
    });
  if (existingBan !== null && existingBan.deleted_at === null) {
    throw new HttpException("Seller already banned", 409);
  }
  // Verify seller exists and is not deleted
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
  });
  if (seller === null || seller.deleted_at !== null) {
    throw new HttpException("Seller not found", 404);
  }
  // Validate ban_reason string from request body
  if (typeof props.body !== "string" || props.body.trim().length === 0) {
    throw new HttpException("Ban reason must be a non-empty string", 400);
  }
  const now = toISOStringSafe(new Date());
  // Create ban record
  const createdBan = await MyGlobal.prisma.shopping_mall_banned_users.create({
    data: {
      id: v4(),
      shopping_mall_seller_id: props.sellerId,
      ban_reason: props.body, // using body as ban_reason string
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: createdBan.id,
    shopping_mall_customer_id: null,
    shopping_mall_seller_id: createdBan.shopping_mall_seller_id,
    ban_reason: createdBan.ban_reason,
    created_at: toISOStringSafe(createdBan.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(createdBan.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: null,
  };
}
