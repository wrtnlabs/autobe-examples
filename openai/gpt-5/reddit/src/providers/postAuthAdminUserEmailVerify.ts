import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdminUserEmailVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserEmailVerify";
import { ICommunityPlatformAdminUserVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserVerification";
import { IEAdminVerificationStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdminVerificationStatus";

export async function postAuthAdminUserEmailVerify(props: {
  body: ICommunityPlatformAdminUserEmailVerify.ICreate;
}): Promise<ICommunityPlatformAdminUserVerification.ISummary> {
  const token = props.body.verification_token;

  const secretCandidate =
    MyGlobal.env && (MyGlobal.env as unknown as { [key: string]: unknown });
  const secretValue = secretCandidate && secretCandidate.JWT_SECRET_KEY;
  if (typeof secretValue !== "string" || secretValue.length === 0) {
    throw new HttpException(
      "Internal Server Error: JWT secret not configured",
      500,
    );
  }

  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, secretValue);
  } catch (e) {
    throw new HttpException("Invalid or expired verification token", 400);
  }

  if (typeof decoded === "string") {
    throw new HttpException("Invalid token payload", 400);
  }

  const sub = decoded.sub;
  if (typeof sub !== "string" || sub.length === 0) {
    throw new HttpException("Invalid token subject", 400);
  }

  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      id: sub,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  if (user.email_verified === true) {
    return {
      ok: true,
      status: "already_verified",
      message: "Email already verified.",
    };
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.community_platform_users.update({
    where: { id: user.id },
    data: {
      email_verified: true,
      updated_at: now,
      account_state:
        user.account_state === "PendingVerification" ||
        user.account_state === "Pending"
          ? "Active"
          : user.account_state,
    },
  });

  return {
    ok: true,
    status: "verified",
    message: "Email verification completed.",
  };
}
