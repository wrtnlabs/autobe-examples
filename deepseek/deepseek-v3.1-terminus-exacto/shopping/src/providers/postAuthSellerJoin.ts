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
  // Check for duplicate email
  const existingEmail = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }

  // Check for duplicate business name
  const existingBusiness =
    await MyGlobal.prisma.shopping_mall_sellers.findFirst({
      where: { business_name: props.body.business_name },
    });
  if (existingBusiness) {
    throw new HttpException("Business name already registered", 409);
  }

  // Hash password
  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  // Create seller record
  const sellerId = v4();
  const now = toISOStringSafe(new Date());

  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: sellerId,
      email: props.body.email,
      password_hash: hashedPassword,
      business_name: props.body.business_name,
      contact_person: props.body.contact_person,
      phone_number: props.body.phone_number,
      business_address: props.body.business_address,
      tax_id: props.body.tax_id ?? null,
      status: "pending_approval",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Create session record
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_seller_id: seller.id,
      ip: props.body.ip ?? "unknown",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: toISOStringSafe(refreshExpires),
    },
  });

  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: now,
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
        created_at: now,
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

  return {
    id: seller.id,
    email: seller.email,
    business_name: seller.business_name,
    contact_person: seller.contact_person,
    phone_number: seller.phone_number,
    business_address: seller.business_address,
    status: seller.status,
    token,
  };
}
