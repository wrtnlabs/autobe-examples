import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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

export async function postEcommerceMallAuthSellerRefresh(props: {
  body: IEcommerceMallSeller.IRefresh;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  interface IJwtPayload {
    type: "seller";
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
  }
  let decoded: IJwtPayload;
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as IJwtPayload;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "seller") {
    throw new HttpException("Invalid token type", 403);
  }
  const session =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.findFirst({
      where: {
        id: decoded.session_id,
        ecommerce_mall_seller_id: decoded.id,
      },
    });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const nowIso = toISOStringSafe(new Date());
  if (toISOStringSafe(session.expired_at) < nowIso) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        approval_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 401);
  }
  const now = new Date();
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  const profileSnapshot =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findFirst({
      where: {
        seller_id: seller.id,
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        logo_image_url: true,
        created_at: true,
      },
    });
  const profile: IEcommerceMallSeller | null =
    profileSnapshot === null
      ? null
      : {
          id: seller.id,
          email: seller.email,
          approvalStatus: seller.approval_status as
            | "pending"
            | "approved"
            | "rejected"
            | "suspended",
          createdAt: toISOStringSafe(seller.created_at),
          updatedAt: toISOStringSafe(seller.updated_at),
          deletedAt:
            seller.deleted_at === null
              ? null
              : toISOStringSafe(seller.deleted_at),
          profile: null,
        };
  return {
    id: seller.id,
    email: seller.email,
    approvalStatus: seller.approval_status as
      | "pending"
      | "approved"
      | "rejected"
      | "suspended",
    createdAt: toISOStringSafe(seller.created_at),
    updatedAt: toISOStringSafe(seller.updated_at),
    deletedAt:
      seller.deleted_at === null ? null : toISOStringSafe(seller.deleted_at),
    profile,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
