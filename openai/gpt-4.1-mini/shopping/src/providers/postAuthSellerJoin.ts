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

export async function postAuthSellerJoin(props: {
  seller: SellerPayload;
  body: IShoppingMallSeller.ICreate;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const existing = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { email: props.body.email },
  });

  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const id: string & tags.Format<"uuid"> = v4();

  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
    },
  });

  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4(),
      shopping_mall_seller_id: seller.id,
      created_at: now,
      expired_at: accessExpires,
      ip: "",
      href: "",
      referrer: "",
    },
  });

  const nowForToken: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  const accessToken: string = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: session.id,
      created_at: nowForToken,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken: string = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: nowForToken,
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
    password_hash: null,
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
