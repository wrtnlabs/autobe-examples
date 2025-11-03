import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postAuthSellerRefresh(props: {
  seller: SellerPayload;
  body: IShoppingMallSeller.IRefresh;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // Step 1: Verify and decode the refresh token
  let decodedRaw = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
    },
  );

  // Narrow decodedRaw to JwtPayload
  if (typeof decodedRaw !== "object" || decodedRaw === null) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  const decoded = decodedRaw as {
    type: string;
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
  };

  // Step 2: Validate token type
  if (decoded.type !== "seller") {
    throw new HttpException("Invalid token type", 403);
  }

  // Step 3: Validate session and seller
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
  if (session.shoppingMallSeller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Step 4: Generate new access and refresh tokens
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Step 5: Update session expiration
  await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });

  // Step 6: Compose returned authorized seller object
  const seller = session.shoppingMallSeller;

  return {
    id: seller.id,
    email: seller.email,
    password_hash: seller.password_hash,
    store_name: seller.store_name,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at:
      seller.deleted_at === null
        ? undefined
        : toISOStringSafe(seller.deleted_at),
    shopping_mall_seller_sessions: undefined,
    shopping_mall_seller_profiles: undefined,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
