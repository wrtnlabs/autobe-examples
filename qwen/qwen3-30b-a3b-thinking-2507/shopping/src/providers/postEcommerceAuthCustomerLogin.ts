import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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

export async function postEcommerceAuthCustomerLogin(props: {
  body: IEcommerceCustomer.ILogin;
}): Promise<IEcommerceCustomer.IAuthorized> {
  const customer = await MyGlobal.prisma.ecommerce_customers.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      email_verified: true,
      is_suspended: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (!customer) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (!customer.email_verified) {
    throw new HttpException("Email not verified", 401);
  }
  if (customer.is_suspended) {
    throw new HttpException("Account suspended", 401);
  }
  if (customer.deleted_at != null) {
    throw new HttpException("Account deleted", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 30 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_customer_sessions.create({
    data: {
      id: v4(),
      customer: {
        connect: { id: customer.id },
      },
      created_at: now.toISOString(),
      expired_at: accessExpires.toISOString(),
      ip: "127.0.0.1",
      href: "",
      referrer: "",
      updated_at: now.toISOString(),
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  const customerData = {
    id: customer.id,
    email: customer.email,
    email_verified: customer.email_verified,
    is_suspended: customer.is_suspended,
    created_at: (customer.created_at as Date).toISOString(),
    updated_at: (customer.updated_at as Date).toISOString(),
    deleted_at: customer.deleted_at
      ? (customer.deleted_at as Date).toISOString()
      : null,
  };
  return {
    ...customerData,
    token,
  };
}
