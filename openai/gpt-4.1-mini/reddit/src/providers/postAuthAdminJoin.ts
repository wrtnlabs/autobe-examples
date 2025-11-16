import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminJoin(props: {
  admin: AdminPayload;
  body: IRedditCommunityAdmin.ICreate;
}): Promise<IRedditCommunityAdmin.IAuthorized> {
  // Check for existing admin by email
  const existing = await MyGlobal.prisma.reddit_community_admins.findUnique({
    where: { email: props.body.email },
  });

  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash the password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Current datetime in ISO string format
  const now = toISOStringSafe(new Date());

  // Create new admin record without non-existent "is_active" property
  const newAdmin = await MyGlobal.prisma.reddit_community_admins.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Define expiration dates
  const accessExpiration = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Create session record for admin
  const session = await MyGlobal.prisma.reddit_community_admin_sessions.create({
    data: {
      id: v4(),
      reddit_community_admin_id: newAdmin.id,
      ip: "",
      href: "",
      referrer: "",
      created_at: now,
      expired_at: toISOStringSafe(accessExpiration),
    },
  });

  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: newAdmin.id,
      session_id: session.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: newAdmin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return the authorized admin object
  return {
    id: newAdmin.id,
    email: newAdmin.email,
    name: "",
    role: "admin",
    is_active: true,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    permissions: [],
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpiration),
      refreshable_until: toISOStringSafe(refreshExpiration),
    },
  } satisfies IRedditCommunityAdmin.IAuthorized;
}
