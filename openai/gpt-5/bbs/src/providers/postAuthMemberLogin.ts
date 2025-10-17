import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberLogin(props: {
  body: IEconDiscussMember.ILogin;
}): Promise<IEconDiscussMember.IAuthorized> {
  const { body } = props;

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
      created_at: true,
      updated_at: true,
    },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  const passwordOk = await PasswordUtil.verify(
    body.password,
    user.password_hash,
  );
  if (!passwordOk) {
    throw new HttpException("Invalid credentials", 401);
  }

  const membership = await MyGlobal.prisma.econ_discuss_members.findFirst({
    where: {
      user_id: user.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!membership) {
    throw new HttpException("Forbidden: Not a member", 403);
  }

  if (user.mfa_enabled && !body.mfa_code) {
    throw new HttpException("MFA required", 401);
  }

  const access = jwt.sign(
    { id: user.id, type: "member" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe", subject: user.id },
  );
  const refresh = jwt.sign(
    { id: user.id, type: "member", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe", subject: user.id },
  );

  const expired_at = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const subject: IEconDiscussMember.ISubject = {
    id: user.id,
    displayName: user.display_name,
    avatarUri: user.avatar_uri ?? undefined,
    timezone: user.timezone ?? undefined,
    locale: user.locale ?? undefined,
    emailVerified: user.email_verified,
    mfaEnabled: user.mfa_enabled,
    createdAt: toISOStringSafe(user.created_at),
    updatedAt: toISOStringSafe(user.updated_at),
  };

  return {
    id: user.id,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
    member: subject,
  };
}
