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

export async function postShoppingMallAdministratorBannedUsersCustomersCustomerIdUnban(props: {
  administrator: AdministratorPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const banned = await MyGlobal.prisma.shopping_mall_banned_users.findFirst({
    where: { shopping_mall_customer_id: props.customerId },
    select: { id: true },
  });
  if (banned === null) return;
  await MyGlobal.prisma.shopping_mall_banned_users.delete({
    where: { id: banned.id },
  });
}
