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

export async function postShoppingMallAdministratorBannedUsersCustomersCustomerIdUnban(props: {
  administrator: AdministratorPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallBannedUser> {
  // Find the existing ban record by customer ID
  const banRecord = await MyGlobal.prisma.shopping_mall_banned_users.findUnique(
    {
      where: { shopping_mall_customer_id: props.customerId },
    },
  );
  if (!banRecord) {
    throw new HttpException("Ban record not found", 404);
  }
  // Lift the ban by setting deleted_at to current timestamp
  const now = toISOStringSafe(new Date());
  const updatedBanRecord =
    await MyGlobal.prisma.shopping_mall_banned_users.update({
      where: { id: banRecord.id },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  return {
    id: updatedBanRecord.id,
    shopping_mall_customer_id: updatedBanRecord.shopping_mall_customer_id,
    shopping_mall_seller_id: updatedBanRecord.shopping_mall_seller_id,
    ban_reason: updatedBanRecord.ban_reason,
    created_at: toISOStringSafe(updatedBanRecord.created_at),
    updated_at: toISOStringSafe(updatedBanRecord.updated_at),
    deleted_at:
      updatedBanRecord.deleted_at === null
        ? null
        : toISOStringSafe(updatedBanRecord.deleted_at),
  };
}
