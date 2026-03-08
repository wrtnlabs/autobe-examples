import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformMemberCollector } from "../collectors/RedditPlatformMemberCollector";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthMemberJoin(props: {
  body: IRedditPlatformMember.IJoin;
}): Promise<IRedditPlatformMember.IAuthorized> {
  // 1. Check for duplicate email
  const existingByEmail =
    await MyGlobal.prisma.reddit_platform_members.findFirst({
      where: { email: props.body.email },
    });
  if (existingByEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Check for duplicate username
  const existingByUsername =
    await MyGlobal.prisma.reddit_platform_members.findFirst({
      where: { username: props.body.username },
    });
  if (existingByUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // 3. Create member record (Collector handles password hashing)
  const member = await MyGlobal.prisma.reddit_platform_members.create({
    data: await RedditPlatformMemberCollector.collect({
      body: typia.assert<IRedditPlatformMember.ICreate>(props.body),
    }),
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    } satisfies Prisma.reddit_platform_membersSelect,
  });
  // 4. Create session record
  const accessExpiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.reddit_platform_member_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member: { connect: { id: member.id } },
      ip: props.body.ip ?? "0.0.0.0",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpiresAt,
    } satisfies Prisma.reddit_platform_member_sessionsCreateInput,
  });
  // 5. Generate JWT tokens
  const tokenPayload = {
    type: "member" as const,
    id: member.id,
    session_id: session.id,
    created_at: toISOStringSafe(new Date()),
  };
  const access: string = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshPayload = {
    ...tokenPayload,
    tokenType: "refresh" as const,
  };
  const refresh: string = jwt.sign(
    refreshPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };
  // 6. Build and return IAuthorized response
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    displayName: member.display_name,
    bio: member.bio,
    avatarUrl: member.avatar_url ?? null,
    karmaScore: member.karma_score,
    isActive: member.is_active,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    deletedAt: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    moderatorOfCommunities: [],
    bannedUsers: [],
    token,
  } satisfies IRedditPlatformMember.IAuthorized;
}
