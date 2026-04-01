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
  let decoded: {
    type: "customer";
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    created_at: string & tags.Format<"date-time">;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as unknown as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate type
  if (decoded.type !== "customer") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists
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
  // 4. Validate customer not deleted
  const customer =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (customer.status === "deleted") {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens with same session_id
  const nowString: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const accessExpiresString: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpiresString: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const accessToken: string = jwt.sign(
    {
      type: "customer" as const,
      id: customer.id as string & tags.Format<"uuid">,
      session_id: decoded.session_id,
      created_at: nowString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshTokenString: string = jwt.sign(
    {
      type: "customer" as const,
      id: customer.id as string & tags.Format<"uuid">,
      session_id: decoded.session_id,
      tokenType: "refresh" as const,
      created_at: nowString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(refreshExpiresString) },
  });
  // 7. Build response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshTokenString,
    expired_at: accessExpiresString,
    refreshable_until: refreshExpiresString,
  };
  const response: IEcommerceMallCustomer.IAuthorized = {
    id: customer.id as string & tags.Format<"uuid">,
    display_name: "",
    phone_number: null,
    status: customer.status,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at:
      customer.deleted_at !== null
        ? toISOStringSafe(customer.deleted_at)
        : null,
    email: customer.email,
    token: token,
  };
  return response;
}
