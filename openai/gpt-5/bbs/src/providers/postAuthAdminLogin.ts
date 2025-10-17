import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminLogin(props: {
  body: IEconDiscussAdmin.ILogin;
}): Promise<IEconDiscussAdmin.IAuthorized> {
  const { email, password, mfaCode } = props.body;

  const user = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: {
      email: email,
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
      created_at: true,
      updated_at: true,
    },
  });

  if (!user) {
    throw new HttpException("Unauthorized", 401);
  }

  const admin = await MyGlobal.prisma.econ_discuss_admins.findFirst({
    where: {
      user_id: user.id,
      deleted_at: null,
    },
    select: {
      enforced_2fa: true,
    },
  });

  if (!admin) {
    throw new HttpException("Unauthorized", 401);
  }

  const valid = await PasswordUtil.verify(password, user.password_hash);
  if (!valid) {
    throw new HttpException("Unauthorized", 401);
  }

  if (
    (admin.enforced_2fa || user.mfa_enabled) &&
    (mfaCode === undefined || mfaCode === null || mfaCode.length === 0)
  ) {
    throw new HttpException("Unauthorized", 401);
  }

  const accessToken = jwt.sign(
    {
      id: user.id as string & tags.Format<"uuid">,
      type: "admin" as const,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: user.id as string & tags.Format<"uuid">,
      type: "admin" as const,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const subject: IEconDiscussAdmin.ISubject = {
    id: user.id as string & tags.Format<"uuid">,
    displayName: user.display_name,
    emailVerified: user.email_verified,
    mfaEnabled: user.mfa_enabled,
    timezone: user.timezone ?? null,
    locale: user.locale ?? null,
    createdAt: toISOStringSafe(user.created_at),
    updatedAt: toISOStringSafe(user.updated_at),
  };

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiredAt,
    refreshable_until: refreshableUntil,
  };

  return {
    id: user.id as string & tags.Format<"uuid">,
    role: "admin",
    token,
    admin: subject,
  };
}
