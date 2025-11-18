import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function postAuthUserEmailVerify(props: {
  body: ITodoListUser.IVerifyEmail;
}): Promise<ITodoListUser.IVerificationResult> {
  const { email, email_verification_token } = props.body;

  // Look up user matching both email and email_verification_token (and not already verified, not deleted)
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email,
      email_verification_token,
      deleted_at: null,
    },
  });

  if (!user) {
    // Generic failure: not found, wrong token, or already verified
    // (but could be token expired; token-expiry checked below if found)
    return {
      success: false,
      user_status: "verification_failed",
    };
  }

  // If already verified, block repeat verification
  if (user.is_verified) {
    return {
      success: false,
      user_status: "already_verified",
    };
  }

  // If email_verification_sent_at is set and expired (over 24h ago), treat as expired
  let expired = false;
  if (user.email_verification_sent_at) {
    const sentTimeMs = new Date(user.email_verification_sent_at).getTime();
    const nowMs = Date.now();
    const expireMs = 24 * 60 * 60 * 1000; // 24 hours
    expired = nowMs - sentTimeMs > expireMs;
  }
  if (expired) {
    return {
      success: false,
      user_status: "token_expired",
    };
  }

  // Update user to mark verified and clear verification token & sent_at
  await MyGlobal.prisma.todo_list_users.update({
    where: { id: user.id },
    data: {
      is_verified: true,
      email_verification_token: null,
      email_verification_sent_at: null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    success: true,
    user_status: "active",
  };
}
