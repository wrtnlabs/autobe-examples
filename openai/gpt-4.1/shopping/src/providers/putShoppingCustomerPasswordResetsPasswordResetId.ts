import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPasswordReset";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingCustomerPasswordResetsPasswordResetId(props: {
  customer: CustomerPayload;
  passwordResetId: string & tags.Format<"uuid">;
  body: IShoppingPasswordReset.IUpdate;
}): Promise<IShoppingPasswordReset> {
  const { customer, passwordResetId, body } = props;

  // Step 1: Fetch reset request
  const reset = await MyGlobal.prisma.shopping_password_resets.findUnique({
    where: { id: passwordResetId },
  });
  if (reset === null) {
    throw new HttpException("Password reset request not found", 404);
  }

  // Step 2: Authorization
  if (reset.shopping_customer_id !== customer.id) {
    throw new HttpException(
      "You are not authorized to update this password reset request",
      403,
    );
  }

  // Step 3: Business validation
  const nowISOString = toISOStringSafe(new Date());
  if (reset.consumed_at !== null) {
    throw new HttpException(
      "Cannot update an already consumed reset request",
      400,
    );
  }
  if (toISOStringSafe(reset.expires_at) < nowISOString) {
    throw new HttpException(
      "Cannot update an already expired reset request",
      400,
    );
  }

  // Step 4: Update expire/consumed fields
  const updated = await MyGlobal.prisma.shopping_password_resets.update({
    where: { id: passwordResetId },
    data: {
      expires_at: body.expires_at,
      consumed_at: body.consumed_at ?? undefined,
      updated_at: nowISOString,
    },
  });

  // Step 5: Response object
  return {
    id: updated.id,
    shopping_customer_id: updated.shopping_customer_id ?? undefined,
    shopping_seller_id: updated.shopping_seller_id ?? undefined,
    shopping_admin_id: updated.shopping_admin_id ?? undefined,
    request_email: updated.request_email,
    reset_code: updated.reset_code,
    expires_at: toISOStringSafe(updated.expires_at),
    consumed_at: updated.consumed_at
      ? toISOStringSafe(updated.consumed_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
