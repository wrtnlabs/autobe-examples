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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthMemberLogin(props: {
  body: IRedditPlatformMember.ILogin;
}): Promise<IRedditPlatformMember.IAuthorized> {
  const currentTime: string & tags.Format<"date-time"> =
    new Date().toISOString();
  const accessExpiresAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 15 * 60 * 1000,
  ).toISOString();
  const refreshExpiresAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const member = await MyGlobal.prisma.reddit_platform_members.findFirst({
    where: {
      email: props.body.email,
      is_active: true,
      deleted_at: null,
    },
    select: {
      id: true,
      username: true,
      display_name: true,
      email: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  await MyGlobal.prisma.reddit_platform_member_sessions.deleteMany({
    where: {
      user: { id: member.id },
      expired_at: {
        gte: currentTime,
      },
    },
  });
  const session: {
    id: string;
  } = await MyGlobal.prisma.reddit_platform_member_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user: { connect: { id: member.id } },
      created_at: currentTime,
      expired_at: accessExpiresAt,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: currentTime,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: currentTime,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };
  await MyGlobal.prisma.reddit_platform_members.update({
    where: { id: member.id },
    data: { updated_at: currentTime },
  });
  const moderatorCommunities =
    await MyGlobal.prisma.reddit_platform_community_moderators.findMany({
      where: {
        user: { id: member.id },
      },
    });
  const bannedUsers =
    await MyGlobal.prisma.reddit_platform_community_bans.findMany({
      where: {
        banned_by: member.id,
      },
    });
  const moderatorOfCommunities: IRedditPlatformCommunity.ISummary[] =
    moderatorCommunities.length > 0
      ? moderatorCommunities.map((mc) => ({
          id: mc.community_id,
          name: "",
          description: null,
          icon_url: null,
          subscriber_count: 0,
          author: {
            id: mc.user_id,
            username: "",
            displayName: "",
            bio: null,
            avatarUrl: null,
            karmaScore: 0,
            createdAt: currentTime,
            subscriptionCount: 0,
          },
          created_at: mc.created_at.toISOString(),
        }))
      : [];
  const bannedUsersSummary: IRedditPlatformMember.ISummary[] =
    bannedUsers.length > 0
      ? (
          await ArrayUtil.asyncMap(bannedUsers, async (bu) => {
            const bannedMember =
              await MyGlobal.prisma.reddit_platform_members.findUnique({
                where: { id: bu.user_id },
                select: {
                  id: true,
                  username: true,
                  display_name: true,
                  bio: true,
                  avatar_url: true,
                  karma_score: true,
                  created_at: true,
                },
              });
            return bannedMember
              ? {
                  id: bannedMember.id as string & tags.Format<"uuid">,
                  username: bannedMember.username,
                  displayName: bannedMember.display_name,
                  bio: bannedMember.bio,
                  avatarUrl: bannedMember.avatar_url,
                  karmaScore: bannedMember.karma_score,
                  createdAt: bannedMember.created_at.toISOString(),
                  subscriptionCount: 0,
                }
              : null;
          })
        ).filter((u): u is IRedditPlatformMember.ISummary => u !== null)
      : [];
  const response: IRedditPlatformMember.IAuthorized = {
    id: member.id as string & tags.Format<"uuid">,
    email: member.email,
    username: member.username,
    displayName: member.display_name,
    bio: member.bio,
    avatarUrl: member.avatar_url,
    karmaScore: member.karma_score,
    isActive: member.is_active,
    createdAt: member.created_at.toISOString(),
    updatedAt: member.updated_at.toISOString(),
    deletedAt: member.deleted_at?.toISOString() ?? null,
    moderatorOfCommunities: moderatorOfCommunities,
    bannedUsers: bannedUsersSummary,
    token,
  };
  return response;
}
