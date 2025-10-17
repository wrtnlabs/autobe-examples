import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCustomerJoin(props: {
  body: IShoppingMallCustomer.ICreate;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const { body } = props;

  // Check email uniqueness
  const existingCustomer =
    await MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { email: body.email },
    });

  if (existingCustomer) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password
  const hashedPassword = await PasswordUtil.hash(body.password);

  // Generate verification token and timestamp
  const verificationToken = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create customer account
  const customerId = v4() as string & tags.Format<"uuid">;

  const customer = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: customerId,
      email: body.email,
      password_hash: hashedPassword,
      name: body.name,
      phone: body.phone ?? undefined,
      account_status: "unverified",
      email_verified: false,
      email_verification_token: verificationToken,
      email_verification_sent_at: now,
      failed_login_attempts: 0,
      created_at: now,
      updated_at: now,
    },
  });

  // Generate JWT tokens
  const accessTokenExpiresIn = 60 * 60; // 1 hour in seconds
  const refreshTokenExpiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

  const accessToken = jwt.sign(
    {
      id: customer.id,
      email: customer.email,
      type: "customer",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: accessTokenExpiresIn,
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: customer.id,
      email: customer.email,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshTokenExpiresIn,
      issuer: "autobe",
    },
  );

  // Calculate expiration timestamps
  const currentTime = new Date();
  const accessExpiredAt = toISOStringSafe(
    new Date(currentTime.getTime() + accessTokenExpiresIn * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(currentTime.getTime() + refreshTokenExpiresIn * 1000),
  );

  return {
    id: customer.id as string & tags.Format<"uuid">,
    email: customer.email as string & tags.Format<"email">,
    name: customer.name,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
