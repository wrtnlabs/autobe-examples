import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

export async function postAuthSellerPasswordRequestReset(props: {
  body: IShoppingSeller.IResetPasswordRequest;
}): Promise<IShoppingSeller.IPasswordResetResult> {
  const now = toISOStringSafe(new Date());
  // Compute expires_at: now + 1 hour (in ms)
  const nowDate = new Date();
  const expires = new Date(nowDate.getTime() + 60 * 60 * 1000);
  const expiresAt = toISOStringSafe(expires);
  // Attempt to find seller row by email
  const seller = await MyGlobal.prisma.shopping_sellers.findUnique({
    where: { email: props.body.email },
    select: { id: true },
  });
  if (seller) {
    const resetCode = v4();
    await MyGlobal.prisma.shopping_password_resets.create({
      data: {
        id: v4(),
        shopping_seller_id: seller.id,
        request_email: props.body.email,
        reset_code: resetCode,
        expires_at: expiresAt,
        consumed_at: null,
        created_at: now,
        updated_at: now,
        shopping_customer_id: null,
        shopping_admin_id: null,
      },
    });
    // Email send is handled by platform ops, not here
  }
  // Uniform generic response
  return {
    message:
      "If a seller account exists for this email, password reset instructions have been sent.",
  };
}
