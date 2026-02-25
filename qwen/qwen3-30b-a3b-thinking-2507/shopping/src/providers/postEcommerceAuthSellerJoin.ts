import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceSellerCollector } from "../collectors/EcommerceSellerCollector";
import { EcommerceSellerSessionCollector } from "../collectors/EcommerceSellerSessionCollector";
import { EcommerceSellerSessionTransformer } from "../transformers/EcommerceSellerSessionTransformer";
import { EcommerceSellerTransformer } from "../transformers/EcommerceSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAuthSellerJoin(props: {
  body: IEcommerceSeller.IJoin;
}): Promise<IEcommerceSeller.IAuthorized> {
  const existing = await MyGlobal.prisma.ecommerce_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  const seller = await MyGlobal.prisma.ecommerce_sellers.create({
    data: await EcommerceSellerCollector.collect({
      body: props.body,
    }),
    ...EcommerceSellerTransformer.select(),
  });
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_seller_sessions.create({
    data: await EcommerceSellerSessionCollector.collect({
      body: props.body,
      ecommerceSeller: { id: seller.id },
      ip: props.body.ip ?? props.ip,
    }),
    ...EcommerceSellerSessionTransformer.select(),
  });
  const token = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    ...(await EcommerceSellerTransformer.transform(seller)),
    token,
  } satisfies IEcommerceSeller.IAuthorized;
}
