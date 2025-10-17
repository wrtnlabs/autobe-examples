import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminRefresh(props: {
  body: IEconDiscussAdmin.IRefresh;
}): Promise<IEconDiscussAdmin.IAuthorized> {
  const { body } = props;

  // 1) Verify and decode the refresh token
  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Unauthorized", 401);
  }

  // Extract subject id from decoded token (support both id and userId)
  const obj =
    typeof decoded === "object" && decoded !== null
      ? (decoded as Record<string, unknown>)
      : null;
  const subjectId =
    obj && typeof obj["id"] === "string"
      ? (obj["id"] as string)
      : obj && typeof obj["userId"] === "string"
        ? (obj["userId"] as string)
        : null;

  if (!subjectId) {
    throw new HttpException("Unauthorized", 401);
  }

  // tokenType check when present (rotation-on-use semantics)
  const tokenType =
    obj && typeof obj["tokenType"] === "string"
      ? (obj["tokenType"] as string)
      : undefined;
  if (tokenType !== undefined && tokenType !== "refresh") {
    throw new HttpException("Unauthorized", 401);
  }

  // Optional role type discriminator check when present
  const roleType =
    obj && typeof obj["type"] === "string"
      ? (obj["type"] as string)
      : undefined;
  if (roleType !== undefined && roleType !== "admin") {
    throw new HttpException("Forbidden", 403);
  }

  // 2) Load user and ensure admin role still exists and is active
  const user = await MyGlobal.prisma.econ_discuss_users.findFirstOrThrow({
    where: { id: subjectId, deleted_at: null },
    select: {
      id: true,
      display_name: true,
      avatar_uri: true,
      timezone: true,
      locale: true,
      email_verified: true,
      mfa_enabled: true,
      created_at: true,
      updated_at: true,
    },
  });

  const admin = await MyGlobal.prisma.econ_discuss_admins.findFirst({
    where: { user_id: user.id, deleted_at: null },
    select: { id: true, enforced_2fa: true, superuser: true },
  });
  if (!admin) {
    throw new HttpException("Forbidden", 403);
  }

  // 3) Generate new tokens
  const nowMs = Date.now();
  const accessTtlMs = 60 * 60 * 1000; // 1 hour
  const refreshTtlMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  const accessPayload = {
    id: user.id,
    type: "admin" as const,
  };
  const refreshPayload = {
    id: user.id,
    type: "admin" as const,
    tokenType: "refresh" as const,
  };

  const access = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: Math.floor(accessTtlMs / 1000),
    issuer: "autobe",
  });
  const refresh = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: Math.floor(refreshTtlMs / 1000),
    issuer: "autobe",
  });

  const expired_at = toISOStringSafe(new Date(nowMs + accessTtlMs));
  const refreshable_until = toISOStringSafe(new Date(nowMs + refreshTtlMs));

  // 4) Build response
  return {
    id: user.id as string & tags.Format<"uuid">,
    role: "admin",
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
    admin: {
      id: user.id as string & tags.Format<"uuid">,
      displayName: user.display_name,
      // avatarUri omitted to avoid invalid uri branding when null or non-uri
      timezone: user.timezone ?? undefined,
      locale: user.locale ?? undefined,
      emailVerified: user.email_verified,
      mfaEnabled: user.mfa_enabled,
      createdAt: toISOStringSafe(user.created_at),
      updatedAt: toISOStringSafe(user.updated_at),
    },
  };
}
