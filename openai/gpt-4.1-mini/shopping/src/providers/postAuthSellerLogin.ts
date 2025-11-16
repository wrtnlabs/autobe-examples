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

  if (seller.status !== "active" || seller.business_status !== "approved") {
    throw new HttpException("Account inactive or unapproved", 403);
  }

  const isPasswordValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!isPasswordValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const sessionId: string & tags.Format<"uuid"> = v4();

  const nowISO: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const accessExpireISO: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpireISO: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_seller_id: seller.id,
      ip: (props.body.ip ?? "") satisfies string as string,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowISO,
      expired_at: accessExpireISO,
    },
  });

  const accessToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: session.id,
      created_at: nowISO,
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
      id: seller.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: seller.id,
    email: seller.email,
    name: seller.name,
    status: seller.status,
    business_status: seller.business_status,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at:
      seller.deleted_at === undefined
        ? undefined
        : seller.deleted_at === null
          ? null
          : toISOStringSafe(seller.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpireISO,
      refreshable_until: refreshExpireISO,
    },
  };
}
