import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
      approval_status: true,
      rejection_reason: true,
      account_status: true,
      approved_at: true,
      rejected_at: true,
      suspended_at: true,
      banned_at: true,
      last_login_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (seller === null) throw new HttpException("Invalid credentials", 401);
  if (seller.account_status === "banned")
    throw new HttpException("Forbidden", 403);
  if (seller.account_status === "suspended")
    throw new HttpException("Forbidden", 403);
  if (seller.approval_status !== "approved")
    throw new HttpException("Forbidden", 403);
  const verified = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!verified) throw new HttpException("Invalid credentials", 401);
  const nowIso = new Date().toISOString();
  const accessExpiredAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshableUntil = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const sessionId = v4();
  await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_seller_id: seller.id,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: nowIso,
      expired_at: accessExpiredAt,
    },
  });
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: seller.id },
    data: {
      last_login_at: new Date(nowIso),
      updated_at: new Date(nowIso),
    },
  });
  return {
    id: seller.id,
    email: seller.email,
    approvalStatus: seller.approval_status,
    rejectionReason: seller.rejection_reason,
    accountStatus: seller.account_status,
    approvedAt: seller.approved_at?.toISOString() ?? null,
    rejectedAt: seller.rejected_at?.toISOString() ?? null,
    suspendedAt: seller.suspended_at?.toISOString() ?? null,
    bannedAt: seller.banned_at?.toISOString() ?? null,
    lastLoginAt: seller.last_login_at?.toISOString() ?? null,
    createdAt: seller.created_at.toISOString(),
    updatedAt: seller.updated_at.toISOString(),
    deletedAt: seller.deleted_at?.toISOString() ?? null,
    token: {
      access: jwt.sign(
        {
          type: "seller",
          id: seller.id,
          session_id: sessionId,
          created_at: nowIso,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "seller",
          id: seller.id,
          session_id: sessionId,
          created_at: nowIso,
          tokenType: "refresh",
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
