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

export async function postShoppingMallAuthSellerJoin(props: {
  ip: string;
  body: IShoppingMallSeller.IJoin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const existing = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email: props.body.email,
    },
    select: {
      id: true,
    },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      approval_status: "pending",
      rejection_reason: null,
      account_status: "active",
      approved_at: null,
      rejected_at: null,
      suspended_at: null,
      banned_at: null,
      last_login_at: null,
      created_at: new Date(),
      updated_at: new Date(),
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
    },
  });
  const now: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const expiredAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshableUntil: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  return {
    id: seller.id,
    email: seller.email,
    approvalStatus: seller.approval_status,
    rejectionReason: seller.rejection_reason,
    accountStatus: seller.account_status,
    approvedAt:
      seller.approved_at === null ? null : seller.approved_at.toISOString(),
    rejectedAt:
      seller.rejected_at === null ? null : seller.rejected_at.toISOString(),
    suspendedAt:
      seller.suspended_at === null ? null : seller.suspended_at.toISOString(),
    bannedAt: seller.banned_at === null ? null : seller.banned_at.toISOString(),
    lastLoginAt:
      seller.last_login_at === null ? null : seller.last_login_at.toISOString(),
    createdAt: seller.created_at.toISOString(),
    updatedAt: seller.updated_at.toISOString(),
    deletedAt:
      seller.deleted_at === null ? null : seller.deleted_at.toISOString(),
    token: {
      access: jwt.sign(
        {
          type: "seller",
          id: seller.id,
          session_id: seller.id,
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
          type: "seller",
          id: seller.id,
          session_id: seller.id,
          created_at: now,
          tokenType: "refresh",
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "7d",
          issuer: "autobe",
        },
      ),
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  } satisfies IShoppingMallSeller.IAuthorized;
}
