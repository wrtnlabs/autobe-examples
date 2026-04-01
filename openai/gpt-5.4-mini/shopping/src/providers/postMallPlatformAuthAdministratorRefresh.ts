import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformAuthAdministratorRefresh(props: {
  body: IMallPlatformAdministrator.IRefresh;
}): Promise<IMallPlatformAdministrator.IAuthorized> {
  type DecodedRefreshToken = {
    type: string;
    id: string;
    session_id: string;
    created_at: string;
  };
  const isDecodedRefreshToken = (
    input: unknown,
  ): input is DecodedRefreshToken => {
    if (typeof input !== "object" || input === null) return false;
    const record = input as Record<string, unknown>;
    return (
      typeof record.type === "string" &&
      typeof record.id === "string" &&
      typeof record.session_id === "string" &&
      typeof record.created_at === "string"
    );
  };
  let decodedToken: unknown;
  try {
    decodedToken = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (!isDecodedRefreshToken(decodedToken)) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decodedToken.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const session =
    await MyGlobal.prisma.mall_platform_administrator_sessions.findFirst({
      where: {
        id: decodedToken.session_id,
        administrator_id: decodedToken.id,
      },
      select: {
        id: true,
        administrator_id: true,
        expired_at: true,
      },
    });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (session.expired_at.getTime() <= Date.now()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const administrator =
    await MyGlobal.prisma.mall_platform_administrators.findUniqueOrThrow({
      where: {
        id: decodedToken.id,
      },
      select: {
        id: true,
        email: true,
        grade: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (administrator.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (administrator.status !== "active") {
    throw new HttpException(
      "Account is not permitted to access the platform",
      403,
    );
  }
  const now = Date.now();
  const accessExpiresAt = new globalThis.Date(now + 60 * 60 * 1000);
  const refreshExpiresAt = new globalThis.Date(now + 7 * 24 * 60 * 60 * 1000);
  const createdAt = toISOStringSafe(new globalThis.Date(now));
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: decodedToken.session_id,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: decodedToken.session_id,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpiresAt) as string &
      tags.Format<"date-time">,
    refreshable_until: toISOStringSafe(refreshExpiresAt) as string &
      tags.Format<"date-time">,
  };
  await MyGlobal.prisma.mall_platform_administrator_sessions.update({
    where: {
      id: decodedToken.session_id,
    },
    data: {
      expired_at: refreshExpiresAt,
    },
  });
  return {
    id: administrator.id,
    email: administrator.email,
    grade: administrator.grade,
    status: administrator.status,
    createdAt: toISOStringSafe(administrator.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(administrator.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt:
      administrator.deleted_at === null
        ? null
        : (toISOStringSafe(administrator.deleted_at) as string &
            tags.Format<"date-time">),
    token,
  };
}
