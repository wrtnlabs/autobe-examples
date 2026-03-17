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

export async function postShoppingMallAuthSellerLogin(props: {
  ip: string;
  body: IShoppingMallSeller.ILogin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      shop_name: true,
      shop_description: true,
      logo_image_url: true,
      approval_status: true,
      rejection_reason: true,
      suspended: true,
      approved_by_admin_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (!seller) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (seller.suspended) {
    throw new HttpException("Account is suspended", 403);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4(),
      shopping_mall_seller_id: seller.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  const approvedByAdmin: IShoppingMallAdmin.ISummary | null =
    seller.approved_by_admin_id
      ? await (async () => {
          const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
            where: { id: seller.approved_by_admin_id ?? undefined },
            select: {
              id: true,
              email: true,
              grade: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          });
          if (!admin) return null;
          return {
            id: admin.id,
            email: admin.email,
            grade: admin.grade,
            created_at: toISOStringSafe(admin.created_at),
            updated_at: toISOStringSafe(admin.updated_at),
            deleted_at: admin.deleted_at
              ? toISOStringSafe(admin.deleted_at)
              : null,
          } satisfies IShoppingMallAdmin.ISummary;
        })()
      : null;
  return {
    id: seller.id,
    email: seller.email,
    shop_name: seller.shop_name,
    shop_description: seller.shop_description ?? null,
    logo_image_url: seller.logo_image_url ?? null,
    approval_status: typia.assert<"PENDING" | "APPROVED" | "REJECTED">(
      seller.approval_status,
    ),
    rejection_reason: seller.rejection_reason ?? null,
    suspended: seller.suspended,
    approvedByAdmin,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
    token,
  } satisfies IShoppingMallSeller.IAuthorized;
}
