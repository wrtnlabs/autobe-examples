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

export async function getShoppingMallAdministratorBannedUsersBannedUserId(props: {
  administrator: AdministratorPayload;
  bannedUserId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallBannedUser> {
  const bannedUser =
    await MyGlobal.prisma.shopping_mall_banned_users.findUnique({
      where: { id: props.bannedUserId },
    });
  if (!bannedUser) throw new HttpException("Banned user not found", 404);
  return bannedUser;
}
