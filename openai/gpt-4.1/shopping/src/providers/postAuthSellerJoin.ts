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

export async function postAuthSellerJoin(props: {
  body: IShoppingMallSeller.ICreate;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // Duplicate check - email
  const existingByEmail = await MyGlobal.prisma.shopping_mall_sellers.findFirst(
    {
      where: { email: props.body.email },
    },
  );
  if (existingByEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // Duplicate check - registration_number
  const existingByRegNum =
    await MyGlobal.prisma.shopping_mall_sellers.findFirst({
      where: { registration_number: props.body.registration_number },
    });
  if (existingByRegNum) {
    throw new HttpException("Registration number already registered", 409);
  }
  const now = toISOStringSafe(new Date());
  const sellerId = v4();
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: sellerId,
      email: props.body.email,
      password_hash: hashedPassword,
      business_name: props.body.business_name,
      registration_number: props.body.registration_number,
      business_phone: props.body.business_phone,
      is_email_verified: false,
      status: "pending",
      created_at: now,
      updated_at: now,
    },
  });
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_seller_id: seller.id,
      ip:
        props.body.ip == null
          ? "unknown"
          : (props.body.ip satisfies string as string),
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: session.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  return {
    id: seller.id,
    email: seller.email,
    business_name: seller.business_name,
    registration_number: seller.registration_number,
    business_phone: seller.business_phone,
    is_email_verified: seller.is_email_verified,
    status: seller.status,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
    seller: {
      id: seller.id,
      business_name: seller.business_name,
    },
  };
}
