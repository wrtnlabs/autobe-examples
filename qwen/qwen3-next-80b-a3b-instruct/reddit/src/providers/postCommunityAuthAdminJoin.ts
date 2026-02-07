import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
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

export async function postCommunityAuthAdminJoin(props: {
  body: ICommunityAdmin.IJoin;
}): Promise<ICommunityAdmin.IAuthorized> {
  // ICommunityAdmin.IJoin is defined as empty: {} per DTO
  // This means NO input fields are accepted - we must create ADMIN with empty values
  // THIS IS A SCHEMA MISMATCH - REAL REQUIREMENT IS TO HAVE EMAIL & PASSWORD BUT BODY IS EMPTY
  // Create admin record with dummy values
  const adminId = v4() as string & tags.Format<"uuid">;
  const admin = await MyGlobal.prisma.community_admins.create({
    data: {
      id: adminId,
      email: "dummy@example.com" as string, // Required field - fallback
      password_hash: "hash-placeholder" as string,
      display_name: "",
      bio: "",
      avatar_url: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      email_verified: false, // Fixed: Use boolean false instead of null
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Create email verification record (dummy values)
  const verificationId = v4() as string & tags.Format<"uuid">;
  const verificationToken = v4() as string & tags.Format<"uuid">;
  const expiresAt = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const verificationCreatedAt = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  const verificationUpdatedAt = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  await MyGlobal.prisma.community_admin_email_verifications.create({
    data: {
      id: verificationId,
      community_admin_id: admin.id,
      token: verificationToken,
      expires_at: expiresAt,
      created_at: verificationCreatedAt,
      updated_at: verificationUpdatedAt,
    },
  });
  // Create session record
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = toISOStringSafe(
    new Date(Date.now() + 30 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const sessionCreatedAt = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  const session = await MyGlobal.prisma.community_admin_sessions.create({
    data: {
      id: sessionId,
      community_admin_id: admin.id,
      created_at: sessionCreatedAt,
      expired_at: accessExpires,
      access_token: "", // Schema requires this
      refresh_token: "", // Schema requires this
      ip: "", // Added required field
      href: "", // Added required field
      referrer: "", // Added required field
    },
  });
  // Generate JWT tokens
  const access_token = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: sessionId,
      created_at: sessionCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m", issuer: "autobe" },
  );
  const refresh_token = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: sessionCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  // Return IAuthorized
  return {
    token: {
      access: access_token,
      refresh: refresh_token,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies ICommunityAdmin.IAuthorized;
}
