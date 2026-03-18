import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingAuthMemberLogin(props: {
  ip: string;
  body: IHrmTimeTrackingMember.ILogin;
}): Promise<IHrmTimeTrackingMember.IAuthorized> {
  const member = await MyGlobal.prisma.hrm_time_tracking_members.findFirst({
    where: {
      email: props.body.email,
      is_active: true,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      is_active: true,
      last_login_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (member === null) throw new HttpException("Invalid credentials", 401);
  const valid: boolean = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (valid === false) throw new HttpException("Invalid credentials", 401);
  const expiredAt: string = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshableUntil: string = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const now: string = new Date().toISOString();
  const session =
    await MyGlobal.prisma.hrm_time_tracking_member_sessions.create({
      data: {
        id: v4(),
        member: {
          connect: {
            id: member.id,
          },
        },
        ip: props.ip,
        href: "/hrmTimeTracking/auth/member/login",
        referrer: "",
        created_at: now,
        expired_at: expiredAt,
      },
      select: {
        id: true,
        created_at: true,
        expired_at: true,
      },
    });
  await MyGlobal.prisma.hrm_time_tracking_members.update({
    where: {
      id: member.id,
    },
    data: {
      last_login_at: now,
      updated_at: now,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  };
  return {
    id: member.id,
    email: member.email,
    isActive: member.is_active,
    lastLoginAt: now,
    createdAt: member.created_at.toISOString(),
    updatedAt: now,
    deletedAt: null,
    token,
  };
}
