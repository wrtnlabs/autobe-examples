import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postRedditCommunityAuthMemberJoin(props: {
  body: IRedditCommunityMember.IJoin;
}): Promise<IRedditCommunityMember.IAuthorized> {
  // 1. Check duplicate email or username
  const existing = await MyGlobal.prisma.reddit_community_members.findFirst({
    where: {
      OR: [{ email: props.body.email }, { username: props.body.username }],
    },
  });
  if (existing) {
    throw new HttpException("Email or username already registered", 409);
  }
  // 2. Create member manually (no collector available) — using only schema-defined fields
  const member = await MyGlobal.prisma.reddit_community_members.create({
    data: {
      id: v4(),
      email: props.body.email.trim().toLowerCase(),
      password_hash: await PasswordUtil.hash(props.body.password),
      username: props.body.username,
      display_name: props.body.displayName ?? "", // Fixed: use empty string instead of null to satisfy string type
      bio: null,
      avatar_url: null,
      karma_score: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
    },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      created_at: true,
      updated_at: true,
      is_deleted: true,
    },
  });
  // 3. Create session manually — using relation property name "member" (NOT reddit_community_member_id)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_community_member_sessions.create(
    {
      data: {
        id: v4(),
        member: { connect: { id: member.id } },
        ip: "0.0.0.0",
        href: "/redditCommunity/auth/member/join",
        referrer: "",
        created_at: new Date().toISOString(),
        expired_at: accessExpires.toISOString(),
      },
    },
  );
  // 4. Generate JWT tokens
  const access = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: new Date().toISOString(), // Fixed: use current time, not member.created_at
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(), // Fixed: use current time, not member.created_at
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Return IAuthorized — with correct type casting for date-time fields
  return {
    id: member.id as string & tags.Format<"uuid">,
    email: null,
    username: member.username,
    display_name: member.display_name, // Already string type
    bio: member.bio,
    avatar_url: member.avatar_url,
    karma_score: member.karma_score,
    created_at: (member.created_at as string).toString() as string &
      tags.Format<"date-time">,
    updated_at: (member.updated_at as string).toString() as string &
      tags.Format<"date-time">,
    is_deleted: member.is_deleted,
    access,
    refresh,
    token: {
      access,
      refresh,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  } satisfies IRedditCommunityMember.IAuthorized;
}
