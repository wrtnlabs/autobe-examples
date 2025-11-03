import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

export async function postAuthCustomerLogin(props: {
  body: IShoppingCustomer.ILogin;
}): Promise<IShoppingCustomer.IAuthorized> {
  // STEP 1: Fetch customer by email and enforce not deleted
  const customer = await MyGlobal.prisma.shopping_customers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (!customer) {
    throw new HttpException("Invalid email or password", 401);
  }
  if (!customer.is_active) {
    throw new HttpException("Account is not active", 403);
  }

  // STEP 2: Validate password using PasswordUtil
  const valid = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!valid) {
    throw new HttpException("Invalid email or password", 401);
  }

  // STEP 3: Create a new session for this login
  const now = toISOStringSafe(new Date());
  const accessExpiresNum = Date.now() + 60 * 60 * 1000; // 1 hour
  const refreshExpiresNum = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const accessExpires = toISOStringSafe(new Date(accessExpiresNum));
  const refreshExpires = toISOStringSafe(new Date(refreshExpiresNum));

  const sessionData: any = {
    id: v4(),
    shopping_customer_id: customer.id,
    href: props.body.href,
    referrer: props.body.referrer,
    created_at: now,
    expired_at: accessExpires,
  };
  if (props.body.ip !== null && props.body.ip !== undefined) {
    sessionData.ip = props.body.ip satisfies string as string;
  }
  const session = await MyGlobal.prisma.shopping_customer_sessions.create({
    data: sessionData,
  });

  // STEP 4: Issue JWT access & refresh tokens for the actor
  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
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
        type: "customer",
        id: customer.id,
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
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  // STEP 5: Build the IShoppingCustomer.IAuthorized DTO for return
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    is_active: customer.is_active,
    deleted_at: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : undefined,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    token,
    role: "customer",
  };
}
