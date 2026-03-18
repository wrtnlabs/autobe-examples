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

export async function postShoppingMallAuthSellerRefresh(props: {
  body: IShoppingMallSeller.IRefresh;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const decodedToken: unknown = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
    },
  );
  if (
    typeof decodedToken !== "object" ||
    decodedToken === null ||
    !("type" in decodedToken) ||
    !("id" in decodedToken) ||
    !("session_id" in decodedToken) ||
    !("created_at" in decodedToken)
  ) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (
    decodedToken.type !== "seller" ||
    typeof decodedToken.id !== "string" ||
    typeof decodedToken.session_id !== "string" ||
    typeof decodedToken.created_at !== "string"
  ) {
    throw new HttpException("Invalid token type", 403);
  }
  const decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "seller";
  } = {
    id: decodedToken.id as string & tags.Format<"uuid">,
    session_id: decodedToken.session_id as string & tags.Format<"uuid">,
    type: "seller",
  };
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        shopping_mall_seller_id: decoded.id,
      },
    },
  );
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: {
      id: decoded.id,
    },
  });
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  ) as string & tags.Format<"date-time">;
  const accessExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshableUntil: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "1h",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "7d",
    },
  );
  await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: new Date(refreshableUntil),
    },
  });
  return {
    id: seller.id,
    email: seller.email,
    approvalStatus: seller.approval_status,
    rejectionReason: seller.rejection_reason,
    accountStatus: seller.account_status,
    approvedAt:
      seller.approved_at === null ? null : toISOStringSafe(seller.approved_at),
    rejectedAt:
      seller.rejected_at === null ? null : toISOStringSafe(seller.rejected_at),
    suspendedAt:
      seller.suspended_at === null
        ? null
        : toISOStringSafe(seller.suspended_at),
    bannedAt:
      seller.banned_at === null ? null : toISOStringSafe(seller.banned_at),
    lastLoginAt:
      seller.last_login_at === null
        ? null
        : toISOStringSafe(seller.last_login_at),
    createdAt: toISOStringSafe(seller.created_at),
    updatedAt: toISOStringSafe(seller.updated_at),
    deletedAt:
      seller.deleted_at === null ? null : toISOStringSafe(seller.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
