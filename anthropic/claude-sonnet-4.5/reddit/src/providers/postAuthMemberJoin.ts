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

export async function postAuthMemberJoin(props: {
  body: IRedditLikeMember.ICreate;
}): Promise<IRedditLikeMember.IAuthorized> {
  const { body } = props;

  // Check for existing username
  const existingUsername = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: { username: body.username },
  });

  if (existingUsername) {
    throw new HttpException("Username already exists", 409);
  }

  // Check for existing email
  const existingEmail = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: { email: body.email },
  });

  if (existingEmail) {
    throw new HttpException("Email already exists", 409);
  }

  // Hash the password
  const passwordHash = await PasswordUtil.hash(body.password);

  // Generate member ID
  const memberId = v4();

  // Create timestamps
  const now = toISOStringSafe(new Date());

  // Create the member record
  const created = await MyGlobal.prisma.reddit_like_members.create({
    data: {
      id: memberId,
      username: body.username,
      email: body.email,
      password_hash: passwordHash,
      email_verified: false,
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
      username: true,
      email: true,
      email_verified: true,
      profile_bio: true,
      avatar_url: true,
    },
  });

  // Generate JWT tokens with proper expiry times
  const accessTokenExpiry = new Date();
  accessTokenExpiry.setMinutes(accessTokenExpiry.getMinutes() + 30);

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30);

  const accessToken = jwt.sign(
    {
      id: created.id,
      type: "member",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  // Return the authorized member response with initial karma values of 0
  return {
    id: created.id,
    username: created.username,
    email: created.email,
    email_verified: created.email_verified,
    profile_bio: created.profile_bio === null ? undefined : created.profile_bio,
    avatar_url: created.avatar_url === null ? undefined : created.avatar_url,
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
