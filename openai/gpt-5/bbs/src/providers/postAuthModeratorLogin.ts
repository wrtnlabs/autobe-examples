import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorLogin(props: {
  body: IEconDiscussModerator.ILogin;
}): Promise<IEconDiscussModerator.IAuthorized> {
  const { body } = props;

  // Fetch user by email (active accounts only)
  const user = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      display_name: true,
      avatar_uri: true,
      timezone: true,
      locale: true,
      email_verified: true,
      mfa_enabled: true,
    },
  });

  if (!user) {
    // Do not disclose existence of account
    throw new HttpException("Unauthorized: Invalid credentials", 401);
  }

  // Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(body.password, user.password_hash);
  if (!isValid) {
    throw new HttpException("Unauthorized: Invalid credentials", 401);
  }

  // Confirm moderator role assignment (active)
  const moderator = await MyGlobal.prisma.econ_discuss_moderators.findFirst({
    where: {
      user_id: user.id,
      deleted_at: null,
    },
    select: {
      enforced_2fa: true,
    },
  });

  if (!moderator) {
    throw new HttpException("Forbidden: Moderator role not assigned", 403);
  }

  // MFA requirement check - since DTO lacks MFA code, reject when required
  if (user.mfa_enabled || moderator.enforced_2fa) {
    throw new HttpException(
      "Forbidden: Multi-factor authentication required",
      403,
    );
  }

  // Generate JWT tokens with ModeratorPayload-like structure
  const access = jwt.sign(
    {
      id: user.id,
      type: "moderator",
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
      type: "moderator",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Compute token expiry timestamps (ISO strings)
  const expired_at = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  return {
    id: user.id as string & tags.Format<"uuid">,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
    role: "moderator",
    display_name: user.display_name,
    email_verified: user.email_verified,
    mfa_enabled: user.mfa_enabled,
    timezone: user.timezone ?? null,
    locale: user.locale ?? null,
    avatar_uri:
      user.avatar_uri === null
        ? null
        : (user.avatar_uri as string & tags.Format<"uri">),
  };
}
