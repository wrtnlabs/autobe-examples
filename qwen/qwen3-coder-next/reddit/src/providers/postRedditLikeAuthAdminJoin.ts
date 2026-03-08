import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeAdminAtSummaryTransformer } from "../transformers/RedditLikeAdminAtSummaryTransformer";
import { RedditLikeAdminTransformer } from "../transformers/RedditLikeAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeAuthAdminJoin(props: {
  body: IRedditLikeAdmin.IJoin;
}): Promise<IRedditLikeAdmin.IAuthorized> {
  // Check duplicate email
  const existingByEmail = await MyGlobal.prisma.reddit_like_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existingByEmail) throw new HttpException("Email already registered", 409);
  // Check duplicate username
  const existingByUsername = await MyGlobal.prisma.reddit_like_admins.findFirst(
    {
      where: { username: props.body.username },
    },
  );
  if (existingByUsername)
    throw new HttpException("Username already registered", 409);
  // Create admin record with hashed password
  const admin = await MyGlobal.prisma.reddit_like_admins.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      username: props.body.username,
      display_name: props.body.display_name,
      bio: props.body.bio ?? null,
      avatar_url: props.body.avatar_url ?? null,
      karma_score: 0,
    },
    ...RedditLikeAdminTransformer.select(),
  });
  // Generate email verification token
  const verificationId = v4();
  const createdAt = toISOStringSafe(new Date());
  const expiresAt = toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000));
  await MyGlobal.prisma.reddit_like_admin_email_verifications.create({
    data: {
      id: verificationId,
      admin: {
        connect: { id: admin.id },
      },
      token: verificationId,
      created_at: createdAt,
      updated_at: createdAt,
      expires_at: expiresAt,
    },
  });
  // Generate JWT tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_like_admin_sessions.create({
    data: {
      id: v4(),
      admin: {
        connect: { id: admin.id },
      },
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
      ip: "0.0.0.0",
      href: "join",
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    ...(await RedditLikeAdminTransformer.transform(admin)),
    admin: await RedditLikeAdminAtSummaryTransformer.transform(admin),
    token,
  } satisfies IRedditLikeAdmin.IAuthorized;
}
