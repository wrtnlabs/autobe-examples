import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthCustomerLogin(props: {
  ip: string;
  body: IEcommerceMallCustomer.ILogin;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  // 1. Find customer by email with password_hash
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  } satisfies Prisma.ecommerce_mall_customersFindFirstArgs);
  // 2. Check if customer exists and is not soft-deleted
  if (!customer || customer.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Create session with expiration
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date().toISOString();
  const accessExpiresIso = accessExpires.toISOString();
  const refreshExpiresIso = refreshExpires.toISOString();
  const session = await MyGlobal.prisma.ecommerce_mall_customer_sessions.create(
    {
      data: {
        id: v4(),
        ecommerce_mall_customer_id: customer.id,
        ip: props.ip,
        href: "",
        referrer: "",
        created_at: new Date(),
        expired_at: accessExpires,
      },
    },
  );
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  } satisfies IAuthorizationToken;
  // 6. Transform and return IAuthorized response
  const profileData: IEcommerceMallCustomer = {
    id: customer.id,
    customerId: customer.id,
    displayName: null,
    phoneNumber: null,
    createdAt: customer.created_at.toISOString(),
    updatedAt: customer.updated_at.toISOString(),
  };
  return {
    id: customer.id,
    customerId: customer.id,
    displayName: null,
    phoneNumber: null,
    createdAt: customer.created_at.toISOString(),
    updatedAt: customer.updated_at.toISOString(),
    email: customer.email,
    deletedAt: null,
    profile: profileData,
    token,
  } satisfies IEcommerceMallCustomer.IAuthorized;
}
