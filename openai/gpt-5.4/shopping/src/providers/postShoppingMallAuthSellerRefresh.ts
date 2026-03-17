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
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSellerRefresh(props: {
  body: IShoppingMallSeller.IRefresh;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const unauthorized = (): never => {
    throw new HttpException("Invalid or expired refresh token", 401);
  };
  const forbidden = (message: string): never => {
    throw new HttpException(message, 403);
  };
  const verifiedUnknown: unknown = (() => {
    try {
      return jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      });
    } catch {
      unauthorized();
    }
  })();
  if (typeof verifiedUnknown !== "object" || verifiedUnknown === null)
    unauthorized();
  const verifiedObject = verifiedUnknown as {
    type?: unknown;
    id?: unknown;
    session_id?: unknown;
  };
  if (verifiedObject.type !== "seller") unauthorized();
  const verifiedId: string =
    typeof verifiedObject.id === "string" ? verifiedObject.id : unauthorized();
  const verifiedSessionId: string =
    typeof verifiedObject.session_id === "string"
      ? verifiedObject.session_id
      : unauthorized();
  const verified: {
    type: "seller";
    id: string;
    session_id: string;
  } = {
    type: "seller",
    id: verifiedId,
    session_id: verifiedSessionId,
  };
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst(
    {
      where: {
        id: verified.session_id,
        shopping_mall_seller_id: verified.id,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        expired_at: true,
      },
    },
  );
  const sessionRecord = session === null ? unauthorized() : session;
  if (sessionRecord.expired_at.getTime() <= globalThis.Date.now())
    unauthorized();
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: {
      id: verified.id,
    },
    ...ShoppingMallSellerTransformer.select(),
  });
  if (seller.banned === true) forbidden("Seller is banned");
  if (seller.deleted_at !== null) forbidden("Seller account has been deleted");
  const now: string & tags.Format<"date-time"> = toISOStringSafe(
    new globalThis.Date(),
  );
  const accessExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new globalThis.Date(globalThis.Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil: string & tags.Format<"date-time"> = toISOStringSafe(
    new globalThis.Date(globalThis.Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const access: string = jwt.sign(
    {
      type: "seller",
      id: verified.id,
      session_id: verified.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "1h",
    },
  );
  const refresh: string = jwt.sign(
    {
      type: "seller",
      id: verified.id,
      session_id: verified.session_id,
      created_at: now,
      token_type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "7d",
    },
  );
  await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: {
      id: sessionRecord.id,
    },
    data: {
      expired_at: new globalThis.Date(refreshableUntil),
    },
  });
  return {
    ...(await ShoppingMallSellerTransformer.transform(seller)),
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
