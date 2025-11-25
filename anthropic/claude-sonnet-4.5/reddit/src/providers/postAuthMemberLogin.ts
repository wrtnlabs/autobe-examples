import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberLogin(props: {
  body: IRedditCommunityGuest.ILogin;
}): Promise<IRedditCommunityGuest.IAuthorized> {
  const conditions: Prisma.reddit_community_membersWhereInput[] = [];
  if (props.body.username) {
    conditions.push({ username: props.body.username });
  }
  if (props.body.email) {
    conditions.push({ email: props.body.email satisfies string as string });
  }

  const member = await MyGlobal.prisma.reddit_community_members.findFirst({
    where: {
      OR: conditions,
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

  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.reddit_community_member_sessions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_community_member_id: member.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
      },
    },
  );

  const token: IAuthorizationToken = {
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
  };

  return {
    id: member.id,
    username: member.username,
    display_name:
      member.display_name === null ? undefined : member.display_name,
    email: member.email,
    email_verified: member.email_verified,
    bio: member.bio === null ? undefined : member.bio,
    avatar_url: member.avatar_url === null ? undefined : member.avatar_url,
    post_karma: member.post_karma,
    comment_karma: member.comment_karma,
    show_online_status: member.show_online_status,
    show_subscribed_communities: member.show_subscribed_communities,
    show_activity_feed: member.show_activity_feed,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    token,
  };
}
