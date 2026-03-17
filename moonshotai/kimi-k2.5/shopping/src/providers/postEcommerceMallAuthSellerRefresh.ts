import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
  // 1. Verify and decode refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type matches expected actor
  if (decoded.type !== "seller") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and belongs to this seller
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
  // 4. Validate seller account exists and not deleted
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: decoded.id },
    },
  );
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Calculate new expiration timestamps (1 hour for access, 7 days for refresh)
  const now = Date.now();
  const accessExpiresTimestamp = now + 60 * 60 * 1000;
  const refreshExpiresTimestamp = now + 7 * 24 * 60 * 60 * 1000;
  const accessExpiresAt = toISOStringSafe(new Date(accessExpiresTimestamp));
  const refreshExpiresAt = toISOStringSafe(new Date(refreshExpiresTimestamp));
  // 6. Update session with new expiration time
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: new Date(refreshExpiresTimestamp),
    },
  });
  // 7. Generate new access token (short-lived, 1 hour)
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  // 8. Generate new refresh token (long-lived, 7 days)
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 9. Fetch the most recent seller profile snapshot
  const sellerProfile =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findFirst({
      where: { seller_id: decoded.id },
      orderBy: { created_at: "desc" },
      select: {
        shop_name: true,
        shop_description: true,
        logo_image_url: true,
      },
    });
  return {
    id: seller.id as string & tags.Format<"uuid">,
    email: seller.email as string & tags.Format<"email">,
    approvalStatus: seller.approval_status,
    createdAt: toISOStringSafe(seller.created_at),
    updatedAt: toISOStringSafe(seller.updated_at),
    deletedAt:
      seller.deleted_at !== null ? toISOStringSafe(seller.deleted_at) : null,
    shopName: sellerProfile?.shop_name ?? null,
    shopDescription: sellerProfile?.shop_description ?? null,
    logoImageUrl: sellerProfile?.logo_image_url as
      | (string & tags.Format<"url">)
      | null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    } satisfies IAuthorizationToken,
  };
}
