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
  body: IEcommerceMallCustomer.ILogin;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      display_name: true,
      phone_number: true,
      account_status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!customer) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (
    customer.account_status === "suspended" ||
    customer.account_status === "banned"
  ) {
    throw new HttpException("Account is not accessible", 403);
  }
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_mall_customer_sessions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        customer: { connect: { id: customer.id } },
        ip: "",
        href: "",
        referrer: "",
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
      } satisfies Prisma.ecommerce_mall_customer_sessionsCreateInput,
    },
  );
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    id: customer.id as string & tags.Format<"uuid">,
    email: customer.email as string & tags.Format<"email">,
    display_name: customer.display_name,
    phone_number: customer.phone_number,
    account_status: customer.account_status as
      | "active"
      | "suspended"
      | "banned",
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : null,
    token,
  } satisfies IEcommerceMallCustomer.IAuthorized;
}
