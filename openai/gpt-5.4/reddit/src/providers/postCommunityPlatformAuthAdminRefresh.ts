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
import { CommunityPlatformAdminTransformer } from "../transformers/CommunityPlatformAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthAdminRefresh(props: {
  body: ICommunityPlatformAdmin.IRefresh;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "admin";
    created_at: string & tags.Format<"date-time">;
    tokenType?: string;
    exp?: number;
    iat?: number;
    iss?: string;
  };
  try {
    decoded = typia.assert<{
      id: string & tags.Format<"uuid">;
      session_id: string & tags.Format<"uuid">;
      type: "admin";
      created_at: string & tags.Format<"date-time">;
      tokenType?: string;
      exp?: number;
      iat?: number;
      iss?: string;
    }>(
      jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      }),
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }
  if (decoded.tokenType !== undefined && decoded.tokenType !== "refresh") {
    throw new HttpException("Invalid refresh token", 401);
  }
  const session =
    await MyGlobal.prisma.community_platform_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        community_platform_admin_id: decoded.id,
        expired_at: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        community_platform_admin_id: true,
      },
    });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const adminForPolicy =
    await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
      where: { id: decoded.id },
      select: {
        id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (adminForPolicy.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (adminForPolicy.status !== "active") {
    throw new HttpException(
      "Administrator account is not permitted to access",
      403,
    );
  }
  const nowEpoch: number = Math.floor(new Date().getTime() / 1000);
  const accessExpiresEpoch: number = nowEpoch + 60 * 60;
  const refreshExpiresEpoch: number = nowEpoch + 7 * 24 * 60 * 60;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(nowEpoch * 1000),
  );
  const expiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(accessExpiresEpoch * 1000),
  );
  const refreshableUntil: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(refreshExpiresEpoch * 1000),
  );
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  };
  await MyGlobal.prisma.community_platform_admin_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: new Date(refreshableUntil),
    },
  });
  const admin =
    await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
      where: { id: decoded.id },
      ...CommunityPlatformAdminTransformer.select(),
    });
  const transformed = await CommunityPlatformAdminTransformer.transform(admin);
  return {
    ...transformed,
    token,
  };
}
