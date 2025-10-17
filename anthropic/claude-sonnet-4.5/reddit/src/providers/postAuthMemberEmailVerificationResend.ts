import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

export async function postAuthMemberEmailVerificationResend(props: {
  body: IRedditLikeMember.IResendVerification;
}): Promise<IRedditLikeMember.IVerificationResent> {
  const { body } = props;

  const user = await MyGlobal.prisma.reddit_like_users.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      email_verified: true,
    },
  });

  if (!user) {
    return {
      success: true,
      message:
        "If an account with this email exists and is unverified, a verification email has been sent.",
    };
  }

  if (user.email_verified) {
    return {
      success: true,
      message:
        "This email address is already verified. You can proceed to login.",
    };
  }

  const now = toISOStringSafe(new Date());
  const expiresAt = toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000));

  await MyGlobal.prisma.reddit_like_email_verifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_like_user_id: user.id,
      email: user.email,
      verification_token: v4() as string & tags.Format<"uuid">,
      verification_type: "registration",
      expires_at: expiresAt,
      verified_at: null,
      created_at: now,
    },
  });

  return {
    success: true,
    message:
      "A new verification email has been sent. Please check your inbox and spam folder. The link will expire in 24 hours.",
  };
}
