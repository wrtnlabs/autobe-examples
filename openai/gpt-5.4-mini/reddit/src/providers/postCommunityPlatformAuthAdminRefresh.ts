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

export async function postCommunityPlatformAuthAdminRefresh(props: {
  body: ICommunityPlatformAdmin.IRefresh;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  const isRefreshPayload = (
    value: unknown,
  ): value is {
    id: string;
    session_id: string;
    type: string;
  } => {
    if (typeof value !== "object" || value === null) return false;
    const record: Record<string, unknown> = value as Record<string, unknown>;
    return (
      typeof record.id === "string" &&
      typeof record.session_id === "string" &&
      typeof record.type === "string"
    );
  };
  let decodedUnknown: unknown;
  try {
    decodedUnknown = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (!isRefreshPayload(decodedUnknown)) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decodedUnknown.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  const session =
    await MyGlobal.prisma.community_platform_admin_sessions.findFirst({
      where: {
        id: decodedUnknown.session_id,
        community_platform_admin_id: decodedUnknown.id,
      },
      select: {
        id: true,
        community_platform_admin_id: true,
        expired_at: true,
      },
    });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const admin =
    await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
      where: {
        id: decodedUnknown.id,
      },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const createdAt = toISOStringSafe(new Date());
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.community_platform_admin_sessions.update({
    where: {
      id: decodedUnknown.session_id,
    },
    data: {
      expired_at: new Date(refreshExpiresAt),
    },
  });
  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at === null ? null : toISOStringSafe(admin.deleted_at),
    token: {
      access: jwt.sign(
        {
          type: "admin",
          id: admin.id,
          session_id: decodedUnknown.session_id,
          created_at: createdAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          issuer: "autobe",
          expiresIn: "1h",
        },
      ),
      refresh: jwt.sign(
        {
          type: "admin",
          id: admin.id,
          session_id: decodedUnknown.session_id,
          created_at: createdAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          issuer: "autobe",
          expiresIn: "7d",
        },
      ),
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
