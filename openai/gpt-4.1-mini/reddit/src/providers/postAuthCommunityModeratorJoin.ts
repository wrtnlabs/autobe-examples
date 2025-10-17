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

export async function postAuthCommunityModeratorJoin(props: {
  body: IRedditCommunityCommunityModerator.IJoin;
}): Promise<IRedditCommunityCommunityModerator.IAuthorized> {
  const { email, password } = props.body;

  const existingMember =
    await MyGlobal.prisma.reddit_community_members.findUnique({
      where: { email },
      select: { id: true },
    });

  if (existingMember) {
    throw new HttpException("Email already registered", 400);
  }

  const password_hash = await PasswordUtil.hash(password);
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_community_members.create({
    data: {
      id: v4(),
      email,
      password_hash,
      is_email_verified: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  const accessToken = jwt.sign(
    {
      userId: created.id,
      email: created.email,
      type: "communitymoderator",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      userId: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: created.id,
    email: created.email,
    is_email_verified: created.is_email_verified,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ),
    },
  };
}
