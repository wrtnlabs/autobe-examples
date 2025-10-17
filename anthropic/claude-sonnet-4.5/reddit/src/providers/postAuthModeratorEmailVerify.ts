import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

export async function postAuthModeratorEmailVerify(props: {
  body: IRedditLikeModerator.IEmailVerification;
}): Promise<IRedditLikeModerator.IEmailVerificationConfirmation> {
  const { body } = props;

  const verification =
    await MyGlobal.prisma.reddit_like_email_verifications.findUnique({
      where: {
        verification_token: body.verification_token,
      },
    });

  if (!verification) {
    throw new HttpException(
      "Invalid verification token. Please check your email for the correct link.",
      404,
    );
  }

  if (verification.verified_at !== null) {
    throw new HttpException(
      "This verification link has already been used. Your email is already verified.",
      400,
    );
  }

  const currentTime = new Date();
  const expirationTime = new Date(verification.expires_at);

  if (currentTime > expirationTime) {
    throw new HttpException(
      "This verification link has expired. Please request a new verification email.",
      400,
    );
  }

  const user = await MyGlobal.prisma.reddit_like_users.findUnique({
    where: {
      id: verification.reddit_like_user_id,
    },
  });

  if (!user) {
    throw new HttpException("Associated user account not found.", 404);
  }

  if (user.role !== "moderator") {
    throw new HttpException(
      "This verification link is not valid for moderator accounts.",
      400,
    );
  }

  const verificationTimestamp = toISOStringSafe(new Date());

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_like_users.update({
      where: {
        id: user.id,
      },
      data: {
        email_verified: true,
        updated_at: verificationTimestamp,
      },
    }),
    MyGlobal.prisma.reddit_like_email_verifications.update({
      where: {
        verification_token: body.verification_token,
      },
      data: {
        verified_at: verificationTimestamp,
      },
    }),
  ]);

  return {
    success: true,
    message:
      "Your email has been successfully verified. You now have full moderator privileges.",
  };
}
