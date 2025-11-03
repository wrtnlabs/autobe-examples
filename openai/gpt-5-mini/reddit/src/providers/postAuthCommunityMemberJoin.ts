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

export async function postAuthCommunityMemberJoin(props: {
  body: ICommunityBbsCommunityMember.ICreate;
}): Promise<ICommunityBbsCommunityMember.IAuthorized> {
  const { body } = props;

  // 1) Duplicate check (email or username)
  const existing =
    await MyGlobal.prisma.community_bbs_communitymember.findFirst({
      where: {
        OR: [{ email: body.email }, { username: body.username }],
      },
    });

  if (existing) {
    if (existing.email === body.email) {
      throw new HttpException("Email already registered", 409);
    }
    throw new HttpException("Username already registered", 409);
  }

  // 2) Hash password
  const hashedPassword = await PasswordUtil.hash(body.password);

  // 3) Prepare timestamps and ids
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const memberId = v4() as string & tags.Format<"uuid">;

  // 4) Create member row
  const member = await MyGlobal.prisma.community_bbs_communitymember.create({
    data: {
      id: memberId,
      email: body.email,
      password_hash: hashedPassword,
      username: body.username,
      display_name: body.display_name ?? null,
      karma: 0,
      email_verified: false,
      status: "registered_unverified",
      failed_login_attempts: 0,
      mfa_enabled: false,
      created_at: now,
      updated_at: now,
    },
  });

  // 5) Optional profile creation (separate query to avoid complex nested types)
  if (body.profile) {
    await MyGlobal.prisma.community_bbs_profiles.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_bbs_communitymember_id: member.id,
        display_name: body.profile.display_name ?? null,
        bio: body.profile.bio ?? null,
        avatar_uri: body.profile.avatar_uri ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }

  // 6) Session lifetime calculation
  const requestedTtl = body.session_context.session_ttl_seconds ?? null;
  const accessExpires = toISOStringSafe(
    new Date(
      Date.now() +
        (requestedTtl && requestedTtl > 0
          ? requestedTtl * 1000
          : 60 * 60 * 1000),
    ),
  );
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // 7) Create session row (persisted session for refresh token binding)
  const session =
    await MyGlobal.prisma.community_bbs_communitymember_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_bbs_communitymember_id: member.id,
        ip: body.session_context.ip ?? "",
        href: body.session_context.href ?? null,
        referrer: body.session_context.referrer ?? null,
        created_at: now,
        expired_at: accessExpires,
      },
    });

  // 8) Token generation
  const tokenCreatedAt = now;
  const accessToken = jwt.sign(
    {
      type: "communitymember",
      id: member.id,
      session_id: session.id,
      created_at: tokenCreatedAt,
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
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  // 9) Build member summary according to DTO (avoid exposing sensitive fields)
  const memberSummary: ICommunityBbsCommunityMember.ISummary = {
    id: member.id,
    username: member.username,
    display_name: member.display_name ?? null,
    karma: member.karma,
    created_at: now,
    updated_at: now,
  };

  // 10) Build session summary
  const sessionSummary: ICommunityBbsCommunityMember.ISession = {
    id: session.id,
    ip: session.ip,
    href: session.href ?? null,
    referrer: session.referrer ?? null,
    created_at: session.created_at ? toISOStringSafe(session.created_at) : now,
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };

  // 11) Return authorized response
  return {
    member: memberSummary,
    token,
    session: sessionSummary,
  };
}
