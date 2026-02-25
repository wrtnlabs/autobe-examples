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

export async function postRedditCommunityAuthMemberLogin(props: {
  ip: string;
  body: IRedditCommunityMember.ILogin;
}): Promise<IRedditCommunityMember.IAuthorized> {
  // 1. Find member with password_hash explicitly selected
  const member = await MyGlobal.prisma.reddit_community_members.findFirst({
    where: { email: props.body.email, is_deleted: false },
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
      password_hash: true,
    },
  });
  if (!member) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Create NEW session
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.reddit_community_member_sessions.create(
    {
      data: {
        id: v4(),
        reddit_community_member_id: member.id,
        ip: props.ip,
        href: "", // Default empty string since href doesn't exist on ILogin
        referrer: "", // Default empty string since referrer doesn't exist on ILogin
        created_at: now,
        expired_at: accessExpires,
      },
    },
  );
  // 4. Generate JWT tokens
  const accessPayload = {
    type: "member" as const,
    id: member.id as string & tags.Format<"uuid">,
    session_id: session.id as string & tags.Format<"uuid">,
    created_at: now as string & tags.Format<"date-time">,
  };
  const refreshPayload = {
    type: "member" as const,
    id: member.id as string & tags.Format<"uuid">,
    session_id: session.id as string & tags.Format<"uuid">,
    tokenType: "refresh" as const,
    created_at: now as string & tags.Format<"date-time">,
  };
  const token = {
    access: jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
      issuer: "autobe",
    }),
    expired_at: accessExpires as string & tags.Format<"date-time">,
    refreshable_until: refreshExpires as string & tags.Format<"date-time">,
  };
  // 5. Return IAuthorized with proper typing
  return {
    id: member.id as string & tags.Format<"uuid">,
    email: null as (string & tags.Format<"email">) | null,
    username: member.username as string,
    display_name: member.display_name as string,
    bio: member.bio as (string & tags.MaxLength<500>) | null | undefined,
    avatar_url: member.avatar_url as
      | (string & tags.Format<"uri">)
      | null
      | undefined,
    karma_score: member.karma_score as number & tags.Type<"int32">,
    created_at: toISOStringSafe(member.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(member.updated_at) as string &
      tags.Format<"date-time">,
    is_deleted: member.is_deleted as boolean,
    access: token.access,
    refresh: token.refresh,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at as string & tags.Format<"date-time">,
      refreshable_until: token.refreshable_until as string &
        tags.Format<"date-time">,
    },
  } satisfies IRedditCommunityMember.IAuthorized;
}
