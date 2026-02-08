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
  const refreshToken = (
    props.body as unknown as {
      refreshToken?: string;
    }
  ).refreshToken;
  if (typeof refreshToken !== "string") {
    throw new HttpException("Invalid or missing refresh token", 401);
  }
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "seller") {
    throw new HttpException("Invalid token type", 403);
  }
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        seller_id: decoded.id,
      },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const accessExpireIso = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpireIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const createdAt = toISOStringSafe(new Date());
  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: createdAt,
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
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpireIso },
  });
  return {
    token: {
      access,
      refresh,
      expired_at: accessExpireIso,
      refreshable_until: refreshExpireIso,
    },
  };
}
