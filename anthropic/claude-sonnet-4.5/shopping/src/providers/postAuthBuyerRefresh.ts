import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthBuyerRefresh(props: {
  body: IShoppingMallBuyer.IRefresh;
}): Promise<IShoppingMallBuyer.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: "buyer";
  };

  try {
    decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "buyer";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "buyer") {
    throw new HttpException("Invalid token type", 403);
  }

  const session = await MyGlobal.prisma.shopping_mall_buyer_sessions.findFirst({
    where: {
      id: decoded.session_id,
      shopping_mall_buyer_id: decoded.id,
    },
    include: {
      buyer: true,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (session.buyer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  const accessExpiresMs = Date.now() + 60 * 60 * 1000;
  const refreshExpiresMs = Date.now() + 7 * 24 * 60 * 60 * 1000;

  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
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
    ),
    expired_at: toISOStringSafe(new Date(accessExpiresMs)),
    refreshable_until: toISOStringSafe(new Date(refreshExpiresMs)),
  };

  await MyGlobal.prisma.shopping_mall_buyer_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: new Date(refreshExpiresMs),
    },
  });

  return {
    id: session.buyer.id,
    email: session.buyer.email,
    full_name: session.buyer.full_name,
    phone_number:
      session.buyer.phone_number === null
        ? undefined
        : session.buyer.phone_number,
    email_verified: session.buyer.email_verified,
    created_at: toISOStringSafe(session.buyer.created_at),
    updated_at: toISOStringSafe(session.buyer.updated_at),
    deleted_at:
      session.buyer.deleted_at === null
        ? undefined
        : toISOStringSafe(session.buyer.deleted_at),
    token,
  };
}
