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

export async function postHrmPlatformAuthMemberJoin(props: {
  ip: string;
  body: IHrmPlatformMember.IJoin;
}): Promise<IHrmPlatformMember.IAuthorized> {
  const existing = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const memberId = v4() as string & tags.Format<"uuid">;
  const member = await MyGlobal.prisma.hrm_platform_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.display_name,
      avatar_url: props.body.avatar_url ?? null,
      phone_number: props.body.phone_number ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_url: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4() as string & tags.Format<"uuid">;
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.create({
    data: {
      id: sessionId,
      member_id: memberId,
      access_token: jwt.sign(
        {
          type: "member",
          id: memberId,
          session_id: sessionId,
          created_at: new Date().toISOString(),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh_token: jwt.sign(
        {
          type: "member",
          id: memberId,
          session_id: sessionId,
          tokenType: "refresh",
          created_at: new Date().toISOString(),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: accessExpires,
    },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      expired_at: true,
    },
  });
  const token: IAuthorizationToken = {
    access: session.access_token,
    refresh: session.refresh_token,
    expired_at: toISOStringSafe(session.expired_at),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    id: member.id,
    email: member.email,
    displayName: member.display_name,
    avatarUrl: member.avatar_url ?? null,
    phoneNumber: member.phone_number ?? null,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    deletedAt: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    member: {
      id: member.id,
      email: member.email,
      display_name: member.display_name,
      avatar_url: member.avatar_url ?? null,
      phone_number: member.phone_number ?? null,
      created_at: toISOStringSafe(member.created_at),
    } satisfies IHrmPlatformMember.ISummary,
    token,
  } satisfies IHrmPlatformMember.IAuthorized;
}
