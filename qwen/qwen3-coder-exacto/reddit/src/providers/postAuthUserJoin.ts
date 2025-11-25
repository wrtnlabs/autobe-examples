import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";

export async function postAuthUserJoin(props: {
  body: ICommunityForumCommunityUser.IJoin;
}): Promise<ICommunityForumCommunityUser.IAuthorized> {
  // Check for existing user with same email
  const existingByEmail = await MyGlobal.prisma.community_forum_users.findFirst(
    {
      where: { email: props.body.email },
    },
  );

  if (existingByEmail) {
    throw new HttpException("Email already registered", 409);
  }

  // Check for existing user with same username
  const existingByUsername =
    await MyGlobal.prisma.community_forum_users.findFirst({
      where: { username: props.body.username },
    });

  if (existingByUsername) {
    throw new HttpException("Username already taken", 409);
  }

  // Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Create current timestamps
  const now = toISOStringSafe(new Date());

  // Create user record
  const user = await MyGlobal.prisma.community_forum_users.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: hashedPassword,
      username: props.body.username,
      created_at: now,
      updated_at: now,
    },
  });

  // Create session record
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  const session = await MyGlobal.prisma.community_forum_user_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_forum_user_id: user.id,
      ip: "" as string, // Not provided in join request
      href: "" as string, // Not provided in join request
      referrer: "" as string, // Not provided in join request
      created_at: now,
      expired_at: accessExpires,
    },
  });

  // Generate JWT tokens
  const token: ICommunityForumAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  // Return authorized user response
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token,
  };
}
