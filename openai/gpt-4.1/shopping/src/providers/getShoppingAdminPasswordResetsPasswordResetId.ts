import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPasswordReset";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminPasswordResetsPasswordResetId(props: {
  admin: AdminPayload;
  passwordResetId: string & tags.Format<"uuid">;
}): Promise<IShoppingPasswordReset> {
  const record = await MyGlobal.prisma.shopping_password_resets.findUnique({
    where: { id: props.passwordResetId },
  });
  if (!record) throw new HttpException("Password reset request not found", 404);
  return {
    id: record.id,
    shopping_customer_id: record.shopping_customer_id ?? undefined,
    shopping_seller_id: record.shopping_seller_id ?? undefined,
    shopping_admin_id: record.shopping_admin_id ?? undefined,
    request_email: record.request_email,
    reset_code: record.reset_code,
    expires_at: toISOStringSafe(record.expires_at),
    consumed_at: record.consumed_at
      ? toISOStringSafe(record.consumed_at)
      : undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
