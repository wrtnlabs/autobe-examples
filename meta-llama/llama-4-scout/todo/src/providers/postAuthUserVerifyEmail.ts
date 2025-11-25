import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserEmailVerification";

export async function postAuthUserVerifyEmail(props: {
  body: ITodoListUserEmailVerification.IVerify;
}): Promise<ITodoListUserEmailVerification.IVerified> {
  const { verification_token } = props.body;

  // Find verification event
  const verification =
    await MyGlobal.prisma.todo_list_user_email_verifications.findUnique({
      where: { verification_token },
    });

  if (!verification) {
    return {
      success: false,
      message:
        "Invalid or unknown verification token. Please check your link or request a new email verification.",
    };
  }

  // Check if already used
  if (verification.consumed_at !== null) {
    return {
      success: false,
      message:
        "This verification token has already been used. Please request a new verification email if needed.",
    };
  }

  // Check expiration
  const now = toISOStringSafe(new Date());
  if (toISOStringSafe(verification.expires_at) <= now) {
    return {
      success: false,
      message:
        "This verification token has expired. Please request a new verification email.",
    };
  }

  // Success path: transactionally consume token & verify user
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_list_user_email_verifications.update({
      where: {
        id: verification.id,
      },
      data: {
        consumed_at: now,
      },
    }),
    MyGlobal.prisma.todo_list_users.update({
      where: {
        id: verification.todo_list_user_id,
      },
      data: {
        is_verified: true,
        is_active: true,
        updated_at: now,
      },
    }),
  ]);

  return {
    success: true,
    message:
      "Your email has been verified and your account is now active. You may now log in.",
  };
}
