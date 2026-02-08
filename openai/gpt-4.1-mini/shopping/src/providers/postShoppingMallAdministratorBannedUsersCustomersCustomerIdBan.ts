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

export async function postShoppingMallAdministratorBannedUsersCustomersCustomerIdBan(props: {
  administrator: AdministratorPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallBannedUser.IBanCustomerRequest;
}): Promise<IShoppingMallBannedUser> {
  const now = toISOStringSafe(new Date());
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customerId },
  });
  if (customer === null) {
    throw new HttpException("Customer not found", 404);
  }
  const existed = await MyGlobal.prisma.shopping_mall_banned_users.findFirst({
    where: {
      shopping_mall_customer_id: props.customerId,
      deleted_at: null,
    },
  });
  if (existed !== null) {
    throw new HttpException("Customer is already banned", 409);
  }
  const created = await MyGlobal.prisma.shopping_mall_banned_users.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: props.customerId,
      shopping_mall_seller_id: null,
      ban_reason: "",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return created;
}
