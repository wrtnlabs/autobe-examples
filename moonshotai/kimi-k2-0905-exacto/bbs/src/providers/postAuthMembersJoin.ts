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

export async function postAuthMembersJoin(props: {
  body: IPoliticsBbsMember.IJoin;
}): Promise<IPoliticsBbsMember.IAuthorized> {
  // Check for duplicate username
  const existing = await MyGlobal.prisma.politics_bbs_members.findFirst({
    where: {
      OR: [{ username: props.body.username }, { email: props.body.email }],
    },
  });

  if (existing) {
    throw new HttpException("Username or email already registered", 409);
  }

  // Hash password securely
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Create member record - ID has no @default() so must provide v4()
  const memberId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const member = await MyGlobal.prisma.politics_bbs_members.create({
    data: {
      id: memberId,
      username: props.body.username,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
      // deleted_at defaults to null/nullable for new accounts
    },
  });

  // Create session record for authentication tracking
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const sessionId = v4() as string & tags.Format<"uuid">;
  const sessionExpires = toISOStringSafe(accessExpires);
  const refreshUntil = toISOStringSafe(refreshExpires);

  await MyGlobal.prisma.politics_bbs_member_sessions.create({
    data: {
      id: sessionId,
      politics_bbs_member_id: memberId,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: sessionExpires,
    },
  });

  // Generate JWT tokens with exact payload structure
  const accessToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return authorized member with JWT tokens
  return {
    id: memberId,
    username: member.username,
    email: member.email,
    created_at: now,
    updated_at: now,
    deleted_at: member.deleted_at
      ? (toISOStringSafe(member.deleted_at) satisfies string as string)
      : undefined,
    role: "member",
    password_hash: hashedPassword,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: sessionExpires,
      refreshable_until: refreshUntil,
    },
  };
}
