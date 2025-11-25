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

export async function postAuthSellerLogin(props: {
  body: IShoppingMallSeller.ILogin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (!seller) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (!seller.is_email_verified) {
    throw new HttpException("Email verification required", 403);
  }
  if (seller.status !== "approved") {
    throw new HttpException("Account not permitted to login", 403);
  }
  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = toISOStringSafe(new Date());
  const access_expiry = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refresh_expiry = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session_id = v4();
  const session_create_data: any = {
    id: session_id,
    shopping_mall_seller_id: seller.id,
    href: props.body.href,
    referrer: props.body.referrer,
    created_at: now,
    expired_at: access_expiry,
  };
  if (typeof props.body.ip === "string") {
    session_create_data.ip = props.body.ip satisfies string as string;
  }
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: session_create_data,
  });
  const token = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: now,
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
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: access_expiry,
    refreshable_until: refresh_expiry,
  };
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
    token,
    seller: { id: seller.id, business_name: seller.business_name },
  };
}
