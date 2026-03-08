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
  let decoded: {
    id: string;
    session_id: string;
    type: string;
    created_at: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: string;
      created_at: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "seller") {
    throw new HttpException("Invalid token type", 401);
  }
  const session =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.findFirst({
      where: {
        id: decoded.session_id,
        seller_id: decoded.id,
        expired_at: {
          gt: toISOStringSafe(new Date()),
        },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        approval_status: true,
        rejection_reason: true,
        is_suspended: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  if (seller.is_banned) {
    throw new HttpException("Account has been banned", 403);
  }
  if (seller.is_suspended) {
    throw new HttpException("Account has been suspended", 403);
  }
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const accessExpiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 15 * 60 * 1000),
  );
  const refreshExpiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const currentTimestamp: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const access_token = jwt.sign(
    {
      type: "seller" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: currentTimestamp,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m" as const, issuer: "autobe" },
  );
  const refresh_token = jwt.sign(
    {
      type: "seller" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh" as const,
      created_at: currentTimestamp,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d" as const, issuer: "autobe" },
  );
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresAt },
  });
  return {
    id: seller.id as string & tags.Format<"uuid">,
    email: seller.email as string & tags.Format<"email">,
    approval_status: seller.approval_status as
      | "pending"
      | "approved"
      | "rejected",
    rejection_reason: seller.rejection_reason,
    is_suspended: seller.is_suspended,
    is_banned: seller.is_banned,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: seller.deleted_at ? toISOStringSafe(seller.deleted_at) : null,
    token: {
      access: access_token,
      refresh: refresh_token,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
