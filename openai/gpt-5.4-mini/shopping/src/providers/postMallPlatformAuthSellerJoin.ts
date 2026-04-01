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

export async function postMallPlatformAuthSellerJoin(props: {
  ip: string;
  body: IMallPlatformSeller.IJoin;
}): Promise<IMallPlatformSeller.IAuthorized> {
  const duplicated = await MyGlobal.prisma.mall_platform_sellers.findFirst({
    where: { email: props.body.email },
    select: { id: true },
  });
  if (duplicated !== null)
    throw new HttpException("Email already registered", 409);
  const createdAt = toISOStringSafe(new Date());
  const sessionCreatedAt = createdAt;
  const sessionExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    const seller = await prisma.mall_platform_sellers.create({
      data: {
        id: v4(),
        email: props.body.email,
        password_hash: await PasswordUtil.hash(props.body.password),
        status: "pending",
        rejection_reason: null,
        created_at: new Date(createdAt),
        updated_at: new Date(createdAt),
        deleted_at: null,
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
    await prisma.mall_platform_seller_approval_requests.create({
      data: {
        id: v4(),
        mall_platform_seller_id: seller.id,
        status: "pending",
        rejection_reason: null,
        reviewed_at: null,
        created_at: new Date(createdAt),
        updated_at: new Date(createdAt),
        deleted_at: null,
      },
    });
    const session = await prisma.mall_platform_seller_sessions.create({
      data: {
        id: v4(),
        mall_platform_seller_id: seller.id,
        ip: props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: new Date(sessionCreatedAt),
        expired_at: new Date(sessionExpiredAt),
      },
      select: {
        id: true,
        created_at: true,
        expired_at: true,
      },
    });
    return { seller, session };
  });
  const tokenCreatedAt = toISOStringSafe(new Date());
  return {
    id: result.seller.id,
    email: result.seller.email,
    status: result.seller.status,
    rejectionReason: result.seller.rejection_reason,
    createdAt: result.seller.created_at.toISOString(),
    updatedAt: result.seller.updated_at.toISOString(),
    deletedAt:
      result.seller.deleted_at === null
        ? null
        : result.seller.deleted_at.toISOString(),
    token: {
      access: jwt.sign(
        {
          type: "seller",
          id: result.seller.id,
          session_id: result.session.id,
          created_at: tokenCreatedAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "seller",
          id: result.seller.id,
          session_id: result.session.id,
          tokenType: "refresh",
          created_at: tokenCreatedAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: result.session.expired_at.toISOString(),
      refreshable_until: sessionExpiredAt,
    },
  };
}
