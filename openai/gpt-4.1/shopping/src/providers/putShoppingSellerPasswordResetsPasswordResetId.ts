import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPasswordReset";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingSellerPasswordResetsPasswordResetId(props: {
  seller: SellerPayload;
  passwordResetId: string & tags.Format<"uuid">;
  body: IShoppingPasswordReset.IUpdate;
}): Promise<IShoppingPasswordReset> {
  // Fetch the password reset record belonging to this seller
  const record = await MyGlobal.prisma.shopping_password_resets.findUnique({
    where: { id: props.passwordResetId },
  });
  if (!record || record.shopping_seller_id !== props.seller.id) {
    throw new HttpException(
      "Password reset not found or you do not have permission.",
      404,
    );
  }
  // Disallow updates if expired or already consumed
  const now = toISOStringSafe(new Date());
  if (toISOStringSafe(record.expires_at) < now) {
    throw new HttpException("Cannot update expired password reset.", 400);
  }
  if (record.consumed_at) {
    throw new HttpException(
      "Cannot update an already consumed password reset.",
      400,
    );
  }
  // Update fields
  const updated = await MyGlobal.prisma.shopping_password_resets.update({
    where: { id: props.passwordResetId },
    data: {
      expires_at: props.body.expires_at,
      consumed_at: props.body.consumed_at ?? undefined,
      updated_at: now,
    },
  });
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
