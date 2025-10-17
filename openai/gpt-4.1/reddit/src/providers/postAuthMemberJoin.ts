import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberJoin(props: {
  body: ICommunityPlatformMember.ICreate;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  const { email, password } = props.body;
  const existing = await MyGlobal.prisma.community_platform_members.findUnique({
    where: { email },
  });
  if (existing) {
    throw new HttpException("이 이메일은 이미 등록되어 있습니다.", 409);
  }
  const password_hash = await PasswordUtil.hash(password);
  const now = toISOStringSafe(new Date());
  const member = await MyGlobal.prisma.community_platform_members.create({
    data: {
      id: v4(),
      email,
      password_hash,
      email_verified: false,
      status: "active",
      created_at: now,
      updated_at: now,
    },
  });
  const accessExpire = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
  const refreshExpire = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days
  const token: IAuthorizationToken = {
    access: jwt.sign(
      { id: member.id, type: "member" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      { id: member.id, type: "member", refresh: true },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpire,
    refreshable_until: refreshExpire,
  };
  return {
    id: member.id,
    email: member.email,
    email_verified: member.email_verified,
    status: member.status,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at === null ? null : toISOStringSafe(member.deleted_at),
    token,
  };
}
