import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthAdminJoin(props: {
  body: ICommunityPlatformAdmin.IJoin;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Hash the password
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  // 3. Prepare timestamps
  const now = new Date();
  const createdAt = now.toISOString();
  const updatedAt = createdAt;
  const accessExpires = new Date(Date.now() + 3600 * 1000).toISOString();
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 3600 * 1000,
  ).toISOString();
  // 4. Create admin record
  const admin = await MyGlobal.prisma.community_platform_admins.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      display_name: props.body.displayName,
      bio: props.body.bio ?? null,
      avatar_url: props.body.avatarUrl ?? null,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: null,
    },
  });
  // 5. Create session record - use correct relation property
  const session =
    await MyGlobal.prisma.community_platform_admin_sessions.create({
      data: {
        id: v4(),
        admin: { connect: { id: admin.id } },
        created_at: createdAt,
        updated_at: updatedAt,
        expired_at: accessExpires,
        deleted_at: null,
      },
    });
  // 6. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: createdAt,
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
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires satisfies string & tags.Format<"date-time">,
    refreshable_until: refreshExpires satisfies string &
      tags.Format<"date-time">,
  };
  // 7. Return authorized admin with token
  return {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email,
    displayName: admin.display_name,
    bio: admin.bio,
    avatarUrl: admin.avatar_url,
    createdAt: createdAt satisfies string & tags.Format<"date-time">,
    updatedAt: updatedAt satisfies string & tags.Format<"date-time">,
    deletedAt: null,
    token,
  } satisfies ICommunityPlatformAdmin.IAuthorized;
}
