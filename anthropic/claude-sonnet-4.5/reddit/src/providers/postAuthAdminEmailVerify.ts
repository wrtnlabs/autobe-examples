import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

export async function postAuthAdminEmailVerify(props: {
  body: IRedditLikeAdmin.IEmailVerification;
}): Promise<IRedditLikeAdmin.IEmailVerificationResponse> {
  const { body } = props;

  const verification =
    await MyGlobal.prisma.reddit_like_email_verifications.findFirst({
      where: {
        verification_token: body.verification_token,
      },
      include: {
        user: true,
      },
    });

  if (!verification) {
    throw new HttpException(
      "Invalid verification token. This link is not valid.",
      404,
    );
  }

  if (verification.verified_at !== null) {
    throw new HttpException(
      "This verification link has already been used.",
      400,
    );
  }

  const currentTimestamp = toISOStringSafe(new Date());

  if (currentTimestamp > toISOStringSafe(verification.expires_at)) {
    throw new HttpException(
      "This email verification link has expired. Please request a new verification email.",
      400,
    );
  }

  if (
    verification.verification_type !== "registration" &&
    verification.verification_type !== "email_change"
  ) {
    throw new HttpException("Invalid verification type.", 400);
  }

  if (verification.user.role !== "admin") {
    throw new HttpException(
      "This verification link is not valid for admin accounts.",
      403,
    );
  }

  await MyGlobal.prisma.reddit_like_email_verifications.update({
    where: { id: verification.id },
    data: {
      verified_at: currentTimestamp,
    },
  });

  await MyGlobal.prisma.reddit_like_users.update({
    where: { id: verification.reddit_like_user_id },
    data: {
      email_verified: true,
      updated_at: currentTimestamp,
      ...(verification.verification_type === "email_change" && {
        email: verification.email,
      }),
    },
  });

  const message =
    verification.verification_type === "registration"
      ? "Your email has been successfully verified. Your account is now fully activated."
      : "Your email change has been successfully verified. Your new email address is now active.";

  return {
    success: true,
    message,
  };
}
