import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
}): Promise<void> {
  await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
    select: { id: true, deleted_at: true },
  });
  const existingBan =
    await MyGlobal.prisma.shopping_mall_banned_users.findUnique({
      where: { shopping_mall_seller_id: props.sellerId },
      select: { id: true },
    });
  if (existingBan !== null) return;
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  const banId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.shopping_mall_banned_users.create({
    data: {
      id: banId,
      shopping_mall_seller_id: props.sellerId,
      ban_reason: "Banned by administrator",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}
