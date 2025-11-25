import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // Verify refresh token
  const decodedUnknown = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );

  if (
    typeof decodedUnknown !== "object" ||
    decodedUnknown === null ||
    typeof (decodedUnknown as any).id !== "string" ||
    typeof (decodedUnknown as any).session_id !== "string" ||
    (decodedUnknown as any).type !== "seller"
  ) {
    throw new HttpException("Invalid refresh token payload", 401);
  }

  const decoded: { id: string; session_id: string; type: "seller" } = {
    id: (decodedUnknown as any).id,
    session_id: (decodedUnknown as any).session_id,
    type: "seller",
  };

  // Validate session
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        shopping_mall_seller_id: decoded.id,
      },
      include: {
        shoppingMallSeller: true,
      },
    },
  );

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Removed check for session.shoppingMallSeller.deleted_at because the property does not exist in Prisma type

  // Generate expiration dates as strings
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Generate new tokens
  const issuedAt = toISOStringSafe(new Date());

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: issuedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: issuedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });

  const seller = session.shoppingMallSeller;

  return {
    id: seller.id,
    email: seller.email,
    password_hash: undefined,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
