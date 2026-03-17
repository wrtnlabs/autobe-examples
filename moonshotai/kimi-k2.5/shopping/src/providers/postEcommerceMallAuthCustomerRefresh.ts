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
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type is customer
  if (decoded.type !== "customer") {
    throw new HttpException("Invalid token type for customer refresh", 403);
  }
  const customerId = decoded.id as string & tags.Format<"uuid">;
  const sessionId = decoded.session_id as string & tags.Format<"uuid">;
  // 3. Validate session exists and belongs to this customer
  const session =
    await MyGlobal.prisma.ecommerce_mall_customer_sessions.findFirst({
      where: {
        id: sessionId,
        ecommerce_mall_customer_id: customerId,
      },
    });
  if (!session) {
    throw new HttpException("Session not found or expired", 401);
  }
  // 4. Check session not expired
  if (session.expired_at < new Date()) {
    throw new HttpException("Session has expired", 401);
  }
  // 5. Validate customer account is active
  const customer =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (customer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 6. Generate new tokens with SAME session_id
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const accessToken = jwt.sign(
    {
      type: "customer",
      id: customerId,
      session_id: sessionId,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "customer",
      id: customerId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration only
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.update({
    where: { id: sessionId },
    data: {
      expired_at: refreshExpires,
    },
  });
  // 8. Build and return authorized response
  return {
    id: customer.id,
    customerId: customer.id,
    displayName: null,
    phoneNumber: null,
    createdAt: toISOStringSafe(customer.created_at),
    updatedAt: toISOStringSafe(customer.updated_at),
    email: customer.email,
    deletedAt: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : null,
    profile: {
      id: customer.id,
      customerId: customer.id,
      displayName: null,
      phoneNumber: null,
      createdAt: toISOStringSafe(customer.created_at),
      updatedAt: toISOStringSafe(customer.updated_at),
    },
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
