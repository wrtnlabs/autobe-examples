import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCommunityMemberLogin(props: {
  body: ICommunityBbsCommunityMember.ILogin;
}): Promise<ICommunityBbsCommunityMember.IAuthorized> {
  const { body } = props;

  // Find member by username OR email
  const member = await MyGlobal.prisma.community_bbs_communitymember.findFirst({
    where: {
      OR: [{ email: body.usernameOrEmail }, { username: body.usernameOrEmail }],
    },
  });

  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }

  // If account is currently locked, deny login
  if (member.lockout_until && member.lockout_until > new Date()) {
    throw new HttpException("Account is locked", 403);
  }

  // Verify password using centralized utility
  const isValid = await PasswordUtil.verify(
    body.password,
    member.password_hash,
  );
  if (!isValid) {
    const THRESHOLD = 5;
    const LOCKOUT_MINUTES = 15;
    const failed = member.failed_login_attempts + 1;

    await MyGlobal.prisma.community_bbs_communitymember.update({
      where: { id: member.id },
      data: {
        failed_login_attempts: failed,
        ...(failed >= THRESHOLD && {
          lockout_until: toISOStringSafe(
            new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000),
          ),
        }),
      },
    });

    throw new HttpException("Invalid credentials", 401);
  }

  // MFA must be satisfied before issuing tokens
  if (member.mfa_enabled) {
    throw new HttpException("Multi-factor authentication required", 403);
  }

  // Prepare timestamps
  const nowIso = toISOStringSafe(new Date());
  const ttlSeconds = body.session_ttl_seconds ?? 60 * 60;
  const accessExpires = new Date(Date.now() + Number(ttlSeconds) * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Update member last_login and create session atomically
  const results = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_bbs_communitymember.update({
      where: { id: member.id },
      data: {
        last_login_at: nowIso,
        failed_login_attempts: 0,
        lockout_until: null,
      },
    }),
    MyGlobal.prisma.community_bbs_communitymember_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_bbs_communitymember_id: member.id,
        ip: body.ip ?? "0.0.0.0",
        href: body.href,
        referrer: body.referrer,
        created_at: nowIso,
        expired_at: toISOStringSafe(accessExpires),
      },
    }),
  ]);

  const session = results[1];

  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "communitymember",
      id: member.id,
      session_id: session.id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    {
      type: "communitymember",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Build response
  return {
    member: {
      id: member.id,
      username: member.username,
      display_name: member.display_name ?? null,
      karma: member.karma,
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
    },
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
    session: {
      id: session.id,
      ip: session.ip,
      href: session.href ?? null,
      referrer: session.referrer ?? null,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    },
  };
}
