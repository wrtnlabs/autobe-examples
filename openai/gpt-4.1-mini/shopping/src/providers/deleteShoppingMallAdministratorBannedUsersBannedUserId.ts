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

export async function deleteShoppingMallAdministratorBannedUsersBannedUserId(props: {
  administrator: AdministratorPayload;
  bannedUserId: string & tags.Format<"uuid">;
}): Promise<void> {
  const bannedUser =
    await MyGlobal.prisma.shopping_mall_banned_users.findUnique({
      where: { id: props.bannedUserId },
    });
  if (bannedUser === null)
    throw new HttpException("Banned user not found", 404);
  await MyGlobal.prisma.shopping_mall_banned_users.delete({
    where: { id: props.bannedUserId },
  });
}
