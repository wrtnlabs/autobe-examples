import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

export async function postAuthSellerPasswordCompleteReset(props: {
  body: IShoppingSeller.IResetPasswordComplete;
}): Promise<IShoppingSeller.IPasswordResetResult> {
  const genericMessage = {
    message:
      "If the email and reset code are valid, your password has been successfully updated. If not, please initiate the password reset process again.",
  };
  const now = toISOStringSafe(new Date());
  try {
    const reset = await MyGlobal.prisma.shopping_password_resets.findFirst({
      where: {
        reset_code: props.body.reset_code,
        request_email: props.body.email,
        shopping_seller_id: { not: null },
        expires_at: { gte: now },
        consumed_at: null,
      },
    });
    if (!reset) return genericMessage;
    const seller = await MyGlobal.prisma.shopping_sellers.findUnique({
      where: { email: props.body.email },
    });
    if (!seller) return genericMessage;
    const password_hash = await PasswordUtil.hash(props.body.password);
    await MyGlobal.prisma.shopping_sellers.update({
      where: { id: seller.id },
      data: {
        password_hash,
        updated_at: now,
      },
    });
    await MyGlobal.prisma.shopping_password_resets.update({
      where: { id: reset.id },
      data: {
        consumed_at: now,
        updated_at: now,
      },
    });
    return genericMessage;
  } catch {
    return genericMessage;
  }
}
