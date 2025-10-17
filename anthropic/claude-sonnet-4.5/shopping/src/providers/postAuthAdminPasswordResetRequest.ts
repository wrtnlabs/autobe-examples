import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function postAuthAdminPasswordResetRequest(props: {
  body: IShoppingMallAdmin.IPasswordResetRequest;
}): Promise<IShoppingMallAdmin.IPasswordResetRequestResponse> {
  const { body } = props;

  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      email: body.email,
    },
  });

  const genericResponse = {
    message:
      "If an account exists with this email, you will receive password reset instructions.",
  };

  if (!admin) {
    return genericResponse;
  }

  const nowMs = Date.now();
  const oneHourMs = 60 * 60 * 1000;
  const oneHourAgoMs = nowMs - oneHourMs;

  if (admin.email_verification_sent_at !== null) {
    const lastResetMs = admin.email_verification_sent_at.getTime();

    if (lastResetMs > oneHourAgoMs) {
      return genericResponse;
    }
  }

  const resetToken = `${v4()}${v4()}`.replace(/-/g, "");

  const expiresAtMs = nowMs + oneHourMs;
  const expiresAt = toISOStringSafe(new Date(expiresAtMs));
  const sentAt = toISOStringSafe(new Date(nowMs));

  await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: admin.id },
    data: {
      password_reset_token: resetToken,
      password_reset_expires_at: expiresAt,
      email_verification_sent_at: sentAt,
    },
  });

  return genericResponse;
}
