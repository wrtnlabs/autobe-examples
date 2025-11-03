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

export async function postAuthCustomerJoin(props: {
  body: IShoppingCustomer.ICreate;
}): Promise<IShoppingCustomer.IAuthorized> {
  // Step 1: Check for duplicate email or phone
  const dup = await MyGlobal.prisma.shopping_customers.findFirst({
    where: {
      OR: [{ email: props.body.email }, { phone: props.body.phone }],
    },
    select: { email: true, phone: true },
  });
  if (dup?.email === props.body.email)
    throw new HttpException("Email already registered.", 409);
  if (dup?.phone === props.body.phone)
    throw new HttpException("Phone already registered.", 409);

  // Step 2: Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Step 3: Create customer
  const now = toISOStringSafe(new Date());
  const customerId = v4();
  const customer = await MyGlobal.prisma.shopping_customers.create({
    data: {
      id: customerId,
      email: props.body.email,
      password_hash: hashedPassword,
      name: props.body.name,
      phone: props.body.phone,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  });

  // Step 4: Create session
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.shopping_customer_sessions.create({
    data: {
      id: sessionId,
      shopping_customer_id: customerId,
      ip:
        props.body.ip === undefined || props.body.ip === null
          ? ""
          : props.body.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Step 5: Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customerId,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customerId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Step 6: Return authorized customer object
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    is_active: customer.is_active,
    deleted_at: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : null,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    token,
    role: "customer",
  };
}
