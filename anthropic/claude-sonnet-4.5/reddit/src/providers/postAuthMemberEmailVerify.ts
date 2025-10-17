import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

export async function postAuthMemberEmailVerify(props: {
  body: IRedditLikeMember.IVerifyEmail;
}): Promise<IRedditLikeMember.IEmailVerified> {
  const { body } = props;

  // Step 1: Find verification record by token
  const verification =
    await MyGlobal.prisma.reddit_like_email_verifications.findUnique({
      where: {
        verification_token: body.verification_token,
      },
    });

  // Step 2: Validate token exists
  if (!verification) {
    throw new HttpException("Invalid verification token", 404);
  }

  // Step 3: Check if token has expired (compare Date objects before conversion)
  const currentTime = new Date();
  const expirationTime = new Date(verification.expires_at);

  if (currentTime > expirationTime) {
    throw new HttpException(
      "Verification link has expired. Please request a new verification email.",
      400,
    );
  }

  // Step 4: Check if already verified
  if (verification.verified_at !== null) {
    return {
      success: true,
      message: "Your email has already been verified.",
    };
  }

  // Step 5: Update user's email_verified status and handle email change
  const isEmailChange = verification.verification_type === "email_change";

  await MyGlobal.prisma.reddit_like_users.update({
    where: {
      id: verification.reddit_like_user_id,
    },
    data: {
      email_verified: true,
      updated_at: toISOStringSafe(new Date()),
      ...(isEmailChange && { email: verification.email }),
    },
  });

  // Step 6: Mark verification as completed
  await MyGlobal.prisma.reddit_like_email_verifications.update({
    where: {
      verification_token: body.verification_token,
    },
    data: {
      verified_at: toISOStringSafe(new Date()),
    },
  });

  // Step 7: Return success response
  return {
    success: true,
    message: "Your email has been successfully verified.",
  };
}
