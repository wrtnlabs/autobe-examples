import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSellerRefresh(props: {
  body: IShoppingMallSeller.IRefresh;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "seller";
  };
  try {
    const verified = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (
      typeof verified !== "object" ||
      verified === null ||
      !("id" in verified) ||
      !("session_id" in verified) ||
      !("type" in verified) ||
      typeof verified.id !== "string" ||
      typeof verified.session_id !== "string" ||
      typeof verified.type !== "string"
    ) {
      throw new HttpException("Invalid token format", 401);
    }
    decoded = {
      id: verified.id,
      session_id: verified.session_id,
      type: verified.type as "seller",
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "seller") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        shopping_mall_seller_id: decoded.id,
      },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate session not expired
  const now = new Date();
  if (session.expired_at < now) {
    throw new HttpException("Session expired", 401);
  }
  // 5. Validate seller account exists and is active
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (seller.suspended) {
    throw new HttpException("Account has been suspended", 403);
  }
  // 6. Generate new tokens (SAME session_id)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpiresStr = toISOStringSafe(accessExpires);
  const refreshExpiresStr = toISOStringSafe(refreshExpires);
  const createdAt = toISOStringSafe(new Date());
  const access = jwt.sign(
    {
      type: "seller" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "seller" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 8. Build authorized response with seller profile
  const approvedByAdmin: IShoppingMallAdmin.ISummary | null =
    seller.approved_by_admin_id
      ? await (async () => {
          const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
            where: { id: seller.approved_by_admin_id ?? undefined },
          });
          if (!admin) {
            return null;
          }
          return {
            id: admin.id,
            email: admin.email,
            grade: admin.grade,
            created_at: toISOStringSafe(admin.created_at),
            updated_at: toISOStringSafe(admin.updated_at),
            deleted_at: admin.deleted_at
              ? toISOStringSafe(admin.deleted_at)
              : null,
          };
        })()
      : null;
  const approvalStatusValue = seller.approval_status;
  const approvalStatus: "PENDING" | "APPROVED" | "REJECTED" =
    approvalStatusValue === "PENDING" ||
    approvalStatusValue === "APPROVED" ||
    approvalStatusValue === "REJECTED"
      ? approvalStatusValue
      : "PENDING";
  return {
    id: seller.id,
    email: seller.email,
    shop_name: seller.shop_name,
    shop_description: seller.shop_description ?? null,
    logo_image_url: seller.logo_image_url ?? null,
    approval_status: approvalStatus,
    rejection_reason: seller.rejection_reason ?? null,
    suspended: seller.suspended,
    approvedByAdmin,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
    token: {
      access,
      refresh,
      expired_at: accessExpiresStr,
      refreshable_until: refreshExpiresStr,
    },
  };
}
