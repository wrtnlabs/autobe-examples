import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformAuthSellerRefresh(props: {
  body: IMallPlatformSeller.IRefresh;
}): Promise<IMallPlatformSeller.IAuthorized> {
  const refreshTokenResult = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
    },
  );
  if (
    typeof refreshTokenResult !== "object" ||
    refreshTokenResult === null ||
    !("type" in refreshTokenResult) ||
    !("id" in refreshTokenResult) ||
    !("session_id" in refreshTokenResult) ||
    refreshTokenResult.type !== "seller" ||
    typeof refreshTokenResult.id !== "string" ||
    typeof refreshTokenResult.session_id !== "string"
  ) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const session = await MyGlobal.prisma.mall_platform_seller_sessions.findFirst(
    {
      where: {
        id: refreshTokenResult.session_id,
        mall_platform_seller_id: refreshTokenResult.id,
      },
      select: {
        id: true,
        mall_platform_seller_id: true,
        expired_at: true,
      },
    },
  );
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (session.expired_at.getTime() <= Date.now()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const seller = await MyGlobal.prisma.mall_platform_sellers.findUniqueOrThrow({
    where: {
      id: refreshTokenResult.id,
    },
    select: {
      id: true,
      email: true,
      status: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (seller.status !== "approved") {
    throw new HttpException("Seller is not allowed to sign in", 403);
  }
  const accessExpiredAt = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const tokenCreatedAt = toISOStringSafe(new Date());
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: session.id,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: session.id,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  await MyGlobal.prisma.mall_platform_seller_sessions.update({
    where: {
      id: session.id,
    },
    data: {
      expired_at: refreshExpiredAt,
    },
  });
  return {
    id: seller.id,
    email: seller.email,
    status: seller.status,
    rejectionReason: seller.rejection_reason,
    createdAt: toISOStringSafe(seller.created_at),
    updatedAt: toISOStringSafe(seller.updated_at),
    deletedAt:
      seller.deleted_at === null ? null : toISOStringSafe(seller.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpiredAt),
      refreshable_until: toISOStringSafe(refreshExpiredAt),
    },
  };
}
