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

export async function postShoppingMallAdministratorBannedUsersSellersSellerIdUnban(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallBannedUser> {
  const bannedUser =
    await MyGlobal.prisma.shopping_mall_banned_users.findUnique({
      where: { shopping_mall_seller_id: props.sellerId },
    });
  if (!bannedUser) {
    throw new HttpException("Ban record not found", 404);
  }
  const deletedBan = await MyGlobal.prisma.shopping_mall_banned_users.delete({
    where: { shopping_mall_seller_id: props.sellerId },
  });
  return {
    shopping_mall_seller_id: deletedBan.shopping_mall_seller_id!,
    reason: deletedBan.ban_reason,
    created_at: toISOStringSafe(deletedBan.created_at),
    updated_at: toISOStringSafe(deletedBan.updated_at),
    deleted_at:
      deletedBan.deleted_at === null
        ? undefined
        : toISOStringSafe(deletedBan.deleted_at),
  };
}
