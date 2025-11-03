import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMembersLogin(props: {
  body: IPoliticsBbsMember.ILogin;
}): Promise<IPoliticsBbsMember.IAuthorized> {
  // Find member by username and validate not soft-deleted
  const member = await MyGlobal.prisma.politics_bbs_members.findFirst({
    where: {
      username: props.body.username,
      deleted_at: null,
    },
  });

  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Create new session record for this login
  const accessExpires: Date = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.politics_bbs_member_sessions.create({
    data: {
      id: v4(),
      politics_bbs_member_id: member.id,
      ip: props.body.ip ?? "0.0.0.0", // Use provided IP or fallback
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Generate JWT tokens with exact payload structure
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
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
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  } as IAuthorizationToken;

  // Return authorized member data
  return {
    id: member.id,
    username: member.username,
    password_hash: member.password_hash,
    email: member.email,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at
      ? toISOStringSafe(member.deleted_at)
      : undefined,
    role: "member" as const,
    token,
  };
}
