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

export async function postShoppingMallAuthSellerLogin(props: {
  ip: string;
  body: IShoppingMallSeller.ILogin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email: props.body.email,
    },
    select: {
      ...ShoppingMallSellerTransformer.select().select,
      password_hash: true,
    },
  });
  if (seller === null) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (seller.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (seller.banned === true) {
    throw new HttpException("Invalid credentials", 401);
  }
  const valid: boolean = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (valid === false) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now: number = Date.now();
  const createdAt: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(new globalThis.Date(now).toISOString());
  const accessExpiresAt: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(new globalThis.Date(now + 60 * 60 * 1000).toISOString());
  const refreshableUntil: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(new globalThis.Date(now + 7 * 24 * 60 * 60 * 1000).toISOString());
  const sessionId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(v4());
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: sessionId,
      seller: {
        connect: {
          id: seller.id,
        },
      },
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: createdAt,
      expired_at: accessExpiresAt,
    },
    select: {
      id: true,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
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
        type: "seller",
        id: seller.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiresAt,
    refreshable_until: refreshableUntil,
  };
  return {
    ...(await ShoppingMallSellerTransformer.transform(seller)),
    token,
  };
}
