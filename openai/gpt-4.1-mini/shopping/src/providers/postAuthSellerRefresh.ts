import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postAuthSellerRefresh(props: {
  seller: SellerPayload;
  body: IShoppingMallSeller.IRefresh;
}): Promise<IShoppingMallSeller.IAuthorized> {
  let decodedToken: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "seller";
  };

  try {
    const decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      decoded.type !== "seller" ||
      typeof decoded.id !== "string" ||
      typeof decoded.session_id !== "string"
    ) {
      throw new HttpException("Invalid refresh token payload", 401);
    }

    decodedToken = {
      id: decoded.id as string & tags.Format<"uuid">,
      session_id: decoded.session_id as string & tags.Format<"uuid">,
      type: "seller",
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst(
    {
      where: {
        id: decodedToken.session_id,
        shopping_mall_seller_id: decodedToken.id,
      },
    },
  );

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: decodedToken.id },
  });

  if (!seller) {
    throw new HttpException("Seller not found", 401);
  }

  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  const nowTimestamp = Date.now();
  const accessExpiresTimestamp = nowTimestamp + 60 * 60 * 1000;
  const refreshExpiresTimestamp = nowTimestamp + 7 * 24 * 60 * 60 * 1000;

  const accessExpires = toISOStringSafe(new Date(accessExpiresTimestamp));
  const refreshExpires = toISOStringSafe(new Date(refreshExpiresTimestamp));
  const createdAt = toISOStringSafe(new Date(nowTimestamp));

  const token = {
    access: jwt.sign(
      {
        type: decodedToken.type,
        id: decodedToken.id,
        session_id: decodedToken.session_id,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: decodedToken.type,
        id: decodedToken.id,
        session_id: decodedToken.session_id,
        tokenType: "refresh",
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: { id: decodedToken.session_id },
    data: { expired_at: new Date(refreshExpiresTimestamp) },
  });

  return {
    id: seller.id,
    email: seller.email,
    name: seller.name,
    status: typia.assert<"active" | "inactive" | "suspended">(seller.status),
    business_status: typia.assert<"approved" | "pending" | "rejected">(
      seller.business_status,
    ),
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at:
      seller.deleted_at === null
        ? undefined
        : toISOStringSafe(seller.deleted_at),
    token,
  };
}
