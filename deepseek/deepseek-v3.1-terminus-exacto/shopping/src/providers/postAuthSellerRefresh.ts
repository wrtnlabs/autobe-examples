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
  // Verify and decode refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "seller";
    tokenType?: string;
    created_at?: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "seller";
      tokenType?: string;
      created_at?: string;
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Validate token type and tokenType
  if (decoded.type !== "seller") {
    throw new HttpException("Invalid token type", 403);
  }

  if (decoded.tokenType !== "refresh") {
    throw new HttpException("Invalid token type for refresh operation", 403);
  }

  // Validate session exists and is active
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        shopping_mall_seller_id: decoded.id,
        expired_at: null,
      },
      include: {
        seller: true,
      },
    },
  );

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (!session.seller) {
    throw new HttpException("Associated seller account not found", 404);
  }

  // Check seller account status
  if (session.seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  if (
    session.seller.status !== "active" &&
    session.seller.status !== "verified"
  ) {
    throw new HttpException("Seller account is not active", 403);
  }

  // Generate new tokens with same session_id
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const accessToken = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Update session expiration time
  await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  // Return seller information with new tokens
  return {
    id: session.seller.id as string & tags.Format<"uuid">,
    email: session.seller.email as string & tags.Format<"email">,
    business_name: session.seller.business_name,
    contact_person: session.seller.contact_person,
    phone_number: session.seller.phone_number,
    business_address: session.seller.business_address,
    status: session.seller.status,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
