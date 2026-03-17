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
import { EcommerceMallCustomerTransformer } from "../transformers/EcommerceMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthCustomerJoin(props: {
  body: IEcommerceMallCustomer.IJoin;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create customer record with hashed password
  const customerId = v4() as string & tags.Format<"uuid">;
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = new Date();
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.create({
    data: {
      id: customerId,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.display_name ?? null,
      phone_number: props.body.phone_number ?? null,
      account_status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...EcommerceMallCustomerTransformer.select(),
  });
  // 3. Create session record
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.ecommerce_mall_customer_sessions.create(
    {
      data: {
        id: sessionId,
        ecommerce_mall_customer_id: customerId,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
      },
    },
  );
  // 4. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customerId,
        session_id: sessionId,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customerId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 5. Return IAuthorized response
  const transformed =
    await EcommerceMallCustomerTransformer.transform(customer);
  return {
    ...transformed,
    token,
  } satisfies IEcommerceMallCustomer.IAuthorized;
}
