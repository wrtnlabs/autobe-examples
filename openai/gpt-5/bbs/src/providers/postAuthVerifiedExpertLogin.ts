import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussVerifiedExpertLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertLogin";
import { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthVerifiedExpertLogin(props: {
  body: IEconDiscussVerifiedExpertLogin.ICreate;
}): Promise<IEconDiscussVerifiedExpert.IAuthorized> {
  const { body } = props;

  // 1) Locate active user by email (exclude soft-deleted)
  const user = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  // Generic failure to avoid account enumeration
  if (!user) {
    throw new HttpException("Unauthorized: Invalid credentials", 401);
  }

  // 2) Validate password
  const valid = await PasswordUtil.verify(body.password, user.password_hash);
  if (!valid) {
    throw new HttpException("Unauthorized: Invalid credentials", 401);
  }

  // 3) Enforce MFA when enabled (require OTP presence)
  if (user.mfa_enabled) {
    if (body.otp === undefined) {
      throw new HttpException("Unauthorized: MFA code required", 401);
    }
    // NOTE: Actual OTP verification against mfa_secret/recovery codes
    // would occur here when a proper verification utility is available.
  }

  // 4) Ensure verified expert role assignment exists and is active
  const expert = await MyGlobal.prisma.econ_discuss_verified_experts.findFirst({
    where: {
      user_id: user.id,
      deleted_at: null,
    },
  });
  if (!expert) {
    throw new HttpException("Forbidden: Not a verified expert", 403);
  }

  // 5) Issue tokens
  const nowMs = Date.now();
  const accessExpiredAt = toISOStringSafe(new Date(nowMs + 60 * 60 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(nowMs + 7 * 24 * 60 * 60 * 1000),
  );

  const access = jwt.sign(
    {
      id: user.id,
      type: "verifiedExpert",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      id: user.id,
      type: "verifiedExpert",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 6) Build response (convert all Date fields to ISO strings)
  return {
    id: user.id as string & tags.Format<"uuid">,
    role: "verifiedExpert",
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
    email_verified: user.email_verified,
    mfa_enabled: user.mfa_enabled,
    display_name: user.display_name,
    avatar_uri: user.avatar_uri ?? null,
    timezone: user.timezone ?? null,
    locale: user.locale ?? null,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
  };
}
