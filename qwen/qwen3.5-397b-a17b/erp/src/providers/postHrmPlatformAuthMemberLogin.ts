import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAuthMemberLogin(props: {
  ip: string;
  body: IHrmPlatformMember.ILogin;
}): Promise<IHrmPlatformMember.IAuthorized> {
  const member = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_image: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const sessionId = v4();
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nowIso = now.toISOString();
  const accessExpiresIso = accessExpires.toISOString();
  const refreshExpiresIso = refreshExpires.toISOString();
  const accessPayload = {
    type: "member",
    id: member.id,
    session_id: sessionId,
    created_at: nowIso,
  };
  const refreshPayload = {
    type: "member",
    id: member.id,
    session_id: sessionId,
    tokenType: "refresh",
    created_at: nowIso,
  };
  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  const device_info = JSON.stringify({
    ip: props.body.ip ?? props.ip,
    href: props.body.href,
    referrer: props.body.referrer,
  });
  const access_token_hash = await PasswordUtil.hash(accessToken);
  const refresh_token_hash = await PasswordUtil.hash(refreshToken);
  await MyGlobal.prisma.hrm_platform_member_sessions.create({
    data: {
      id: sessionId,
      member: { connect: { id: member.id } },
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
      device_info,
      access_token_hash,
      refresh_token_hash,
    },
  });
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    avatar_image: member.avatar_image ?? null,
    phone_number: member.phone_number ?? null,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    deleted_at: member.deleted_at?.toISOString() ?? null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    },
  };
}
