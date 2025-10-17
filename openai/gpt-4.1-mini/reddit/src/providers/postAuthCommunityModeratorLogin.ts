import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCommunityModeratorLogin(props: {
  body: IRedditCommunityCommunityModerator.ILogin;
}): Promise<IRedditCommunityCommunityModerator.IAuthorized> {
  const { email, password } = props.body;

  const member = await MyGlobal.prisma.reddit_community_members.findFirst({
    where: {
      email,
      is_email_verified: true,
      deleted_at: null,
    },
  });

  if (!member) {
    throw new HttpException("Invalid credentials or unverified email", 401);
  }

  const isPasswordValid = await PasswordUtil.verify(
    password,
    member.password_hash,
  );
  if (!isPasswordValid) {
    throw new HttpException("Invalid credentials or unverified email", 401);
  }

  const now = new Date();
  const expiredAt = toISOStringSafe(new Date(now.getTime() + 60 * 60 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  );

  const accessToken = jwt.sign(
    {
      id: member.id,
      email: member.email,
      is_email_verified: member.is_email_verified,
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    {
      id: member.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: member.id,
    email: member.email,
    is_email_verified: member.is_email_verified,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
