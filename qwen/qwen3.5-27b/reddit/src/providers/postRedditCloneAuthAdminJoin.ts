import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthAdminJoin(props: {
  ip: string;
  body: IRedditCloneAdmin.IJoin;
}): Promise<IRedditCloneAdmin.IAuthorized> {
  // Check duplicate email
  const existingEmail = await MyGlobal.prisma.reddit_clone_admins.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // Check duplicate username
  const existingUsername = await MyGlobal.prisma.reddit_clone_admins.findFirst({
    where: {
      username: props.body.username,
      deleted_at: null,
    },
  });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // Create admin record
  const now = new Date();
  const admin = await MyGlobal.prisma.reddit_clone_admins.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      username: props.body.username,
      display_name: props.body.displayName,
      bio: props.body.bio ?? null,
      avatar: props.body.avatar ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Generate JWT tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: admin.id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: admin.id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // Return IAuthorized
  return {
    id: admin.id,
    email: admin.email,
    username: admin.username,
    displayName: admin.display_name,
    bio: admin.bio,
    avatar: admin.avatar,
    createdAt: admin.created_at.toISOString(),
    updatedAt: admin.updated_at.toISOString(),
    deletedAt: admin.deleted_at?.toISOString() ?? null,
    token,
  };
}
