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
  // 1. Find customer with password_hash
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: { email: props.body.email, deleted_at: null },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
    },
  });
  if (!customer) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Create NEW session
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const customerId = customer.id as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  const session = await MyGlobal.prisma.ecommerce_mall_customer_sessions.create(
    {
      data: {
        id: sessionId,
        customer: { connect: { id: customerId } },
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        access_token: jwt.sign(
          {
            type: "customer" as string,
            id: customerId,
            session_id: sessionId,
            created_at: toISOStringSafe(new Date()),
          },
          MyGlobal.env.JWT_SECRET_KEY,
          {
            expiresIn: "15m",
            issuer: "autobe",
          },
        ),
        refresh_token: jwt.sign(
          {
            type: "customer" as string,
            id: customerId,
            session_id: sessionId,
            created_at: toISOStringSafe(new Date()),
            tokenType: "refresh" as string,
          },
          MyGlobal.env.JWT_SECRET_KEY,
          {
            expiresIn: "7d",
            issuer: "autobe",
          },
        ),
        expires_at: toISOStringSafe(accessExpires),
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
      select: {
        id: true,
        customer: true,
        access_token: true,
        refresh_token: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
      },
    },
  );
  // 4. Build response
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expired_at: toISOStringSafe(session.expires_at),
    customer: {
      id: customer.id,
      email: customer.email,
      is_suspended: false,
      created_at: toISOStringSafe(customer.created_at),
    },
    token: {
      access: session.access_token,
      refresh: session.refresh_token,
      expired_at: toISOStringSafe(session.expires_at),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies IEcommerceMallCustomer.IAuthorized;
}
