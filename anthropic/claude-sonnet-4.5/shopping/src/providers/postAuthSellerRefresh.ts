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

export async function postAuthSellerRefresh(props: {
  body: IShoppingMallSeller.IRefresh;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const { body } = props;

  const session = await MyGlobal.prisma.shopping_mall_sessions.findFirst({
    where: {
      refresh_token: body.refresh_token,
      user_type: "seller",
      seller_id: { not: null },
      is_revoked: false,
    },
    include: {
      seller: true,
    },
  });

  if (!session || !session.seller) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  const currentTimeMs = Date.now();
  const tokenExpiryMs = new Date(session.refresh_token_expires_at).getTime();

  if (tokenExpiryMs <= currentTimeMs) {
    throw new HttpException("Refresh token has expired", 401);
  }

  if (session.seller.account_status !== "active") {
    throw new HttpException("Seller account is not active", 403);
  }

  const accessExpiryMs = currentTimeMs + 30 * 60 * 1000;
  const accessTokenExpiry = toISOStringSafe(new Date(accessExpiryMs));

  const accessToken = jwt.sign(
    {
      sellerId: session.seller.id,
      email: session.seller.email,
      type: "seller",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const msUntilExpiration = tokenExpiryMs - currentTimeMs;
  const daysUntilExpiration = msUntilExpiration / (1000 * 60 * 60 * 24);

  let newRefreshToken = session.refresh_token;
  let refreshExpiresAtIso = toISOStringSafe(session.refresh_token_expires_at);

  if (daysUntilExpiration < 7) {
    const refreshExpiryMs = currentTimeMs + 30 * 24 * 60 * 60 * 1000;

    newRefreshToken = jwt.sign(
      {
        sellerId: session.seller.id,
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "30d",
        issuer: "autobe",
      },
    );

    refreshExpiresAtIso = toISOStringSafe(new Date(refreshExpiryMs));
  }

  await MyGlobal.prisma.shopping_mall_sessions.update({
    where: { id: session.id },
    data: {
      refresh_token: newRefreshToken,
      refresh_token_expires_at: refreshExpiresAtIso,
      last_activity_at: toISOStringSafe(new Date(currentTimeMs)),
    },
  });

  return {
    id: session.seller.id,
    email: session.seller.email,
    business_name: session.seller.business_name,
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: accessTokenExpiry,
      refreshable_until: refreshExpiresAtIso,
    },
  };
}
