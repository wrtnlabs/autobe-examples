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

export async function postAuthSellerLogin(props: {
  seller: SellerPayload;
  body: IShoppingMallSeller.ILogin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: props.body.email },
  });

  if (!seller) {
    throw new HttpException("Invalid credentials", 401);
  }

  const validPassword = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );

  if (!validPassword) {
    throw new HttpException("Invalid credentials", 401);
  }

  const nowIsoString: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const accessExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4(),
      shopping_mall_seller_id: seller.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowIsoString,
      expired_at: accessExpiredAt,
    },
  });

  const token = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: nowIsoString,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowIsoString,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  };

  return {
    id: seller.id,
    email: seller.email,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    token,
  };
}
