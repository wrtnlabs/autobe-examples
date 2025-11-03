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

export async function putShoppingAdminPasswordResetsPasswordResetId(props: {
  admin: AdminPayload;
  passwordResetId: string & tags.Format<"uuid">;
  body: IShoppingPasswordReset.IUpdate;
}): Promise<IShoppingPasswordReset> {
  const { admin, passwordResetId, body } = props;

  // Step 1: Load the password reset record by id
  const reset = await MyGlobal.prisma.shopping_password_resets.findUnique({
    where: { id: passwordResetId },
  });
  if (!reset) {
    throw new HttpException("Password reset request not found", 404);
  }

  // Step 2: Business rules - cannot update if expired or already consumed
  // Use string comparison for ISO8601; ensure UTC timestamps
  const nowIso = toISOStringSafe(new Date());
  const expiresAtString = toISOStringSafe(reset.expires_at);
  if (expiresAtString <= nowIso) {
    throw new HttpException(
      "Cannot update an expired password reset request",
      400,
    );
  }
  if (reset.consumed_at !== null) {
    throw new HttpException(
      "Cannot update a password reset request that has already been consumed",
      400,
    );
  }

  // Step 3: Prepare update object (immutable, no type assertions)
  const updateData = {
    expires_at: body.expires_at,
    updated_at: nowIso,
    ...(body.consumed_at !== undefined && { consumed_at: body.consumed_at }),
  };

  const updated = await MyGlobal.prisma.shopping_password_resets.update({
    where: { id: passwordResetId },
    data: updateData,
  });

  // Step 4: Map/return strict DTO, all dates formatted
  return {
    id: updated.id,
    shopping_customer_id:
      updated.shopping_customer_id !== undefined &&
      updated.shopping_customer_id !== null
        ? updated.shopping_customer_id
        : undefined,
    shopping_seller_id:
      updated.shopping_seller_id !== undefined &&
      updated.shopping_seller_id !== null
        ? updated.shopping_seller_id
        : undefined,
    shopping_admin_id:
      updated.shopping_admin_id !== undefined &&
      updated.shopping_admin_id !== null
        ? updated.shopping_admin_id
        : undefined,
    request_email: updated.request_email,
    reset_code: updated.reset_code,
    expires_at: toISOStringSafe(updated.expires_at),
    consumed_at:
      updated.consumed_at !== undefined && updated.consumed_at !== null
        ? toISOStringSafe(updated.consumed_at)
        : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
