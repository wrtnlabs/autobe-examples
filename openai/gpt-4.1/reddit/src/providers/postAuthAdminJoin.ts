import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminJoin(props: {
  body: ICommunityPlatformAdmin.ICreate;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  // Step 1: Enforce unique email
  const exists = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: { email: props.body.email },
  });
  if (exists) {
    throw new HttpException("Email already registered as admin", 409);
  }

  // Step 2: Secure password hash
  const password_hash = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const admin_id = v4();

  // Step 3: Create new admin
  const admin = await MyGlobal.prisma.community_platform_admins.create({
    data: {
      id: admin_id,
      email: props.body.email,
      password_hash: password_hash,
      display_name: props.body.display_name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Step 4: Issue verification token
  const verification_token = v4();
  const verification_expires = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.community_platform_admin_verification_tokens.create({
    data: {
      id: v4(),
      community_platform_admin_id: admin.id,
      token: verification_token,
      expires_at: verification_expires,
      consumed: false,
      created_at: now,
      consumed_at: null,
    },
  });

  // Step 5: Create admin session
  const session_id = v4();
  const access_expires_at = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refresh_expires_at = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.community_platform_admin_sessions.create({
    data: {
      id: session_id,
      community_platform_admin_id: admin.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: access_expires_at,
    },
  });

  // Step 6: Generate JWTs
  const access = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session_id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 7: Build response per IAuthorized
  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at !== null && admin.deleted_at !== undefined
        ? toISOStringSafe(admin.deleted_at)
        : null,
    token: {
      access,
      refresh,
      expired_at: access_expires_at,
      refreshable_until: refresh_expires_at,
    },
    admin: {
      id: admin.id,
      display_name: admin.display_name,
    },
  };
}
