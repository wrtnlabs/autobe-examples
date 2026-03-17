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

export async function postEcommerceMallAuthCustomerRefresh(props: {
  body: IEcommerceMallCustomer.IRefresh;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  // 1. Verify refresh token
  const verifiedPayload: unknown = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  if (
    typeof verifiedPayload !== "object" ||
    verifiedPayload === null ||
    !("type" in verifiedPayload) ||
    !("id" in verifiedPayload) ||
    !("session_id" in verifiedPayload) ||
    !("created_at" in verifiedPayload)
  ) {
    throw new HttpException("Invalid refresh token", 401);
  }
  const decoded = verifiedPayload as {
    type: string;
    id: string;
    session_id: string;
    tokenType?: string;
    created_at: string;
  };
  // 2. Validate token type
  if (decoded.type !== "customer") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists and is active
  const session =
    await MyGlobal.prisma.ecommerce_mall_customer_sessions.findFirst({
      where: {
        id: decoded.session_id,
        ecommerce_mall_customer_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate session not past expiration
  const now = new Date();
  if (session.expired_at && new Date(session.expired_at) <= now) {
    throw new HttpException("Session has expired", 401);
  }
  // 5. Validate customer account not deleted
  const customer =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (customer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 6. Generate new tokens (SAME session_id)
  const accessExpiresTimestamp: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpiresTimestamp: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const accessToken: string = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh" as const,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(refreshExpiresTimestamp) },
  });
  // 8. Return new tokens
  return {
    id: decoded.id as string & tags.Format<"uuid">,
    display_name: customer.email,
    phone_number: null,
    status: customer.status,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at:
      customer.deleted_at === null
        ? null
        : toISOStringSafe(customer.deleted_at),
    email: customer.email,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresTimestamp,
      refreshable_until: refreshExpiresTimestamp,
    },
  };
}
