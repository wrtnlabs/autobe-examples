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
  // 1. Find session by refresh token (which is the session UUID)
  const session =
    await MyGlobal.prisma.ecommerce_mall_customer_sessions.findUnique({
      where: { id: props.body.refresh },
    });
  if (!session) {
    throw new HttpException("Invalid refresh token", 401);
  }
  // Check if session is expired
  const now = toISOStringSafe(new Date());
  if (
    session.expired_at !== null &&
    toISOStringSafe(session.expired_at) < now
  ) {
    throw new HttpException("Refresh token expired", 401);
  }
  // 2. Verify customer exists and is not deleted
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findUnique({
    where: { id: session.ecommerce_mall_customer_id },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }
  if (customer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 3. Generate new JWT tokens with same session_id
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const accessToken = jwt.sign(
    {
      type: "customer" as const,
      id: customer.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "customer" as const,
      id: customer.id,
      session_id: session.id,
      tokenType: "refresh" as const,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 4. Update session expiration
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.update({
    where: { id: session.id },
    data: {
      expired_at: new Date(refreshExpiresAt),
    },
  });
  // 5. Return IAuthorized response with default values for missing profile/address fields
  return {
    id: customer.id,
    recipientName: "",
    phoneNumber: "",
    streetAddress: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    isDefault: false,
    createdAt: toISOStringSafe(customer.created_at),
    updatedAt: toISOStringSafe(customer.updated_at),
    email: customer.email,
    displayName: "",
    customer: {
      id: customer.id,
      email: customer.email,
      displayName: "",
      createdAt: toISOStringSafe(customer.created_at),
      deletedAt:
        customer.deleted_at !== null
          ? toISOStringSafe(customer.deleted_at)
          : null,
      orderCount: 0,
    },
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt satisfies string as string,
      refreshable_until: refreshExpiresAt satisfies string as string,
    },
  };
}
