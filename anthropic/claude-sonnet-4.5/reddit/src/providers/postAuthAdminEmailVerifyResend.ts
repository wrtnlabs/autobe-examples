import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminEmailVerifyResend(props: {
  admin: AdminPayload;
}): Promise<IRedditLikeAdmin.IResendVerificationResponse> {
  const { admin } = props;

  const adminUser = await MyGlobal.prisma.reddit_like_users.findUniqueOrThrow({
    where: { id: admin.id },
    select: {
      id: true,
      email: true,
      email_verified: true,
    },
  });

  if (adminUser.email_verified) {
    return {
      success: true,
      message: "Your email address is already verified",
    };
  }

  await MyGlobal.prisma.reddit_like_email_verifications.deleteMany({
    where: {
      reddit_like_user_id: adminUser.id,
      verified_at: null,
    },
  });

  const verificationToken = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());
  const expiresAt = toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000));

  await MyGlobal.prisma.reddit_like_email_verifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_like_user_id: adminUser.id,
      email: adminUser.email,
      verification_token: verificationToken,
      verification_type: "registration",
      expires_at: expiresAt,
      verified_at: null,
      created_at: now,
    },
  });

  return {
    success: true,
    message:
      "A new verification email has been sent to your email address. Please check your inbox and click the verification link within 24 hours.",
  };
}
