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

export async function putShoppingMallAdministratorBannedUsersBannedUserId(props: {
  administrator: AdministratorPayload;
  bannedUserId: string & tags.Format<"uuid">;
  body: IShoppingMallBannedUser.IUpdate;
}): Promise<IShoppingMallBannedUser> {
  const bannedUser =
    await MyGlobal.prisma.shopping_mall_banned_users.findUnique({
      where: { id: props.bannedUserId },
    });
  if (!bannedUser) throw new HttpException("Banned user not found", 404);
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_banned_users.update({
    where: { id: props.bannedUserId },
    data: {
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    ban_reason: updated.ban_reason,
    created_at: toISOStringSafe(new Date(updated.created_at)),
    updated_at: toISOStringSafe(new Date(updated.updated_at)),
    deleted_at: updated.deleted_at ?? null,
  };
}
