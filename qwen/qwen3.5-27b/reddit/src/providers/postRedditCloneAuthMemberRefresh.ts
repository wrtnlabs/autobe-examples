import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthMemberRefresh(props: {
  body: IRedditCloneMember.IRefresh;
}): Promise<IRedditCloneMember.IAuthorized> {
  const session = await MyGlobal.prisma.reddit_clone_member_sessions.findFirst({
    where: {
      refresh_token: props.body.refresh_token,
      deleted_at: null,
      expired_at: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      member: {
        select: {
          id: true,
          email: true,
          username: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          profile: {
            select: {
              display_name: true,
              bio: true,
              avatar: true,
              karma: true,
            },
          },
        },
      },
    },
  });
  if (!session) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const member = session.member;
  const profile = member.profile;
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (!profile) {
    throw new HttpException("User profile not found", 404);
  }
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.reddit_clone_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expired_at: refreshExpires,
    },
  });
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: null,
    display_name: profile.display_name,
    bio: profile.bio,
    avatar: profile.avatar,
    karma: profile.karma,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
