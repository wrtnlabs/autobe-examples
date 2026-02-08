import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerPasswordResetsPasswordResetId(props: {
  customer: CustomerPayload;
  passwordResetId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerPasswordReset> {
  const record =
    await MyGlobal.prisma.shopping_mall_customer_password_resets.findUnique({
      where: { id: props.passwordResetId },
    });
  if (record === null) {
    throw new HttpException("Password reset token not found", 404);
  }
  return {
    id: record.id,
    shopping_customer_id: record.shopping_customer_id,
    token: record.token,
    expired_at: toISOStringSafe(record.expired_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
