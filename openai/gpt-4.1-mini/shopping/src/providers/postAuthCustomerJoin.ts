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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postAuthCustomerJoin(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomer.ICreate;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const existingCustomer =
    await MyGlobal.prisma.shopping_mall_customers.findFirst({
      where: { email: props.body.email },
    });
  if (existingCustomer !== null) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const now = toISOStringSafe(new Date());

  const newCustomer = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      nickname: props.body.nickname,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  const accessExpiration = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiration = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const newSession =
    await MyGlobal.prisma.shopping_mall_customer_sessions.create({
      data: {
        id: v4(),
        shopping_mall_customer_id: newCustomer.id,
        created_at: now,
        expired_at: accessExpiration,
        ip: "",
        href: "",
        referrer: "",
      },
    });

  const createdISO = now;

  const accessToken = jwt.sign(
    {
      type: "customer",
      id: newCustomer.id,
      session_id: newSession.id,
      created_at: createdISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "customer",
      id: newCustomer.id,
      session_id: newSession.id,
      tokenType: "refresh",
      created_at: createdISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: newCustomer.id,
    email: newCustomer.email,
    nickname: newCustomer.nickname,
    created_at: toISOStringSafe(newCustomer.created_at),
    updated_at: toISOStringSafe(newCustomer.updated_at),
    deleted_at:
      newCustomer.deleted_at !== null && newCustomer.deleted_at !== undefined
        ? toISOStringSafe(newCustomer.deleted_at)
        : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiration,
      refreshable_until: refreshExpiration,
    },
  };
}
