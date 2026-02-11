import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthAdminJoin(props: {
  body: IRedditPlatformAdmin.IJoin;
}): Promise<IRedditPlatformAdmin.IAuthorized> {
  // 1. Check for existing admin with same email
  const existingAdmin = await MyGlobal.prisma.reddit_platform_admins.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (existingAdmin) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Check for existing admin with same username
  const existingUsername =
    await MyGlobal.prisma.reddit_platform_admins.findFirst({
      where: {
        username: props.body.username,
        deleted_at: null,
      },
    });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // 3. Create admin record with email verification workflow
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const admin = await MyGlobal.prisma.reddit_platform_admins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      username: props.body.username,
      display_name:
        props.body.display_name === null ? null : props.body.display_name,
      bio: props.body.bio === null ? null : props.body.bio,
      karma_score: 0,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 4. Create email verification token
  const verificationToken = v4();
  const hashedToken = await PasswordUtil.hash(verificationToken);
  await MyGlobal.prisma.reddit_platform_admin_email_verifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: admin.id,
      token: hashedToken,
      expires_at: toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000)), // 24 hours
      is_verified: false,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 5. Send verification email (simulated - in real app, use email service)
  // await EmailService.sendVerificationEmail(admin.email, verificationToken);
  // 6. Generate JWT tokens for the new admin
  const tokenPayload = {
    type: "admin" as const,
    id: admin.id,
    session_id: null as string | null, // No session created yet, will be created on login
    created_at: new Date().toISOString(),
  };
  const accessToken = jwt.sign(
    {
      type: tokenPayload.type,
      id: tokenPayload.id,
      session_id: tokenPayload.session_id,
      created_at: tokenPayload.created_at,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: tokenPayload.type,
      id: tokenPayload.id,
      session_id: tokenPayload.session_id,
      tokenType: "refresh" as const,
      created_at: tokenPayload.created_at,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Return admin details without sensitive information
  return {
    id: admin.id,
    email: admin.email,
    username: admin.username,
    displayName: admin.display_name === null ? undefined : admin.display_name,
    bio: admin.bio === null ? undefined : admin.bio,
    avatarUrl: admin.avatar_url === null ? undefined : admin.avatar_url,
    karmaScore: admin.karma_score,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt:
      admin.updated_at !== null ? toISOStringSafe(admin.updated_at) : undefined,
    deletedAt:
      admin.deleted_at !== null ? toISOStringSafe(admin.deleted_at) : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies IRedditPlatformAdmin.IAuthorized;
}
