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

export async function postAuthSellerLogin(props: {
  body: IShoppingMallSeller.ILogin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // Find seller by email
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: props.body.email },
  });

  if (!seller) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check seller account status
  if (seller.status !== "active" && seller.status !== "verified") {
    throw new HttpException("Seller account is not active", 403);
  }

  // Calculate token expiration times
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Create new session record
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_seller_id: seller.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
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
        type: "seller",
        id: seller.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Return seller information with authorization token
  return {
    id: seller.id,
    email: seller.email,
    business_name: seller.business_name,
    contact_person: seller.contact_person,
    phone_number: seller.phone_number,
    business_address: seller.business_address,
    status: seller.status,
    token: token,
  };
}
