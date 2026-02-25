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

export async function postShoppingMallAdministratorBannedUsersCustomersCustomerIdBan(props: {
  administrator: AdministratorPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallBannedUser> {
  const { customerId } = props;
  await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
    where: { id: customerId },
  });
  const existingBan =
    await MyGlobal.prisma.shopping_mall_banned_users.findUnique({
      where: { shopping_mall_customer_id: customerId },
      ...ShoppingMallBannedUserTransformer.select(),
    });
  if (existingBan) {
    return await ShoppingMallBannedUserTransformer.transform(existingBan);
  }
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const newId: string & tags.Format<"uuid"> = v4();
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.shopping_mall_banned_users.create({
      data: {
        id: newId,
        shopping_mall_customer_id: customerId,
        shopping_mall_seller_id: null,
        ban_reason:
          "Administrator ban by postShoppingMallAdministratorBannedUsersCustomersCustomerIdBan",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      ...ShoppingMallBannedUserTransformer.select(),
    });
  });
  return await ShoppingMallBannedUserTransformer.transform(created);
}
