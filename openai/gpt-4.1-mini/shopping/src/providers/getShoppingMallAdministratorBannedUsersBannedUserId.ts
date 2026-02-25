import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallBannedUserTransformer } from "../transformers/ShoppingMallBannedUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorBannedUsersBannedUserId(props: {
  administrator: AdministratorPayload;
  bannedUserId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallBannedUser> {
  const bannedUser =
    await MyGlobal.prisma.shopping_mall_banned_users.findUniqueOrThrow({
      where: { id: props.bannedUserId },
      ...ShoppingMallBannedUserTransformer.select(),
    });
  return await ShoppingMallBannedUserTransformer.transform(bannedUser);
}
