import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberLogin(props: {
  body: IRedditLikeMember.ILogin;
}): Promise<IRedditLikeMember.IAuthorized> {
  const { body } = props;

  const member = await MyGlobal.prisma.reddit_like_members.findUnique({
    where: { email: body.email },
  });

  if (!member) {
    throw new HttpException("Invalid email or password", 401);
  }

  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    member.password_hash,
  );

  if (!isPasswordValid) {
    throw new HttpException("Invalid email or password", 401);
  }

  const now = new Date();
  const accessTokenExpiry = new Date(now.getTime() + 30 * 60 * 1000);
  const refreshTokenExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const tokenPayload = {
    id: member.id,
    type: "member" as const,
  };

  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30m",
    issuer: "autobe",
  });

  const refreshToken = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  await MyGlobal.prisma.reddit_like_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_like_user_id: member.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      access_token_expires_at: toISOStringSafe(accessTokenExpiry),
      refresh_token_expires_at: toISOStringSafe(refreshTokenExpiry),
      last_activity_at: toISOStringSafe(now),
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
    },
  });

  return {
    id: member.id as string & tags.Format<"uuid">,
    username: member.username,
    email: member.email as string & tags.Format<"email">,
    email_verified: member.email_verified,
    profile_bio: member.profile_bio ?? undefined,
    avatar_url: member.avatar_url ?? undefined,
    post_karma: 0,
    comment_karma: 0,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessTokenExpiry),
      refreshable_until: toISOStringSafe(refreshTokenExpiry),
    },
  };
}
