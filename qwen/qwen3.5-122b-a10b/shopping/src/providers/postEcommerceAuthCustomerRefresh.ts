import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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

export async function postEcommerceAuthCustomerRefresh(props: {
  body: IEcommerceCustomer.IRefresh;
}): Promise<IEcommerceCustomer.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "customer";
  };
  try {
    decoded = typia.assert<{
      id: string;
      session_id: string;
      type: "customer";
    }>(
      jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      }),
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "customer") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Find session by refresh token
  const session = await MyGlobal.prisma.ecommerce_customer_sessions.findFirst({
    where: {
      refresh_token: props.body.refresh_token,
      ecommerce_customer_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session not found", 401);
  }
  // 4. Check session expiration
  const now = new Date();
  if (session.expired_at < now) {
    throw new HttpException("Session expired", 401);
  }
  // 5. Verify customer exists and is not deleted
  const customer = await MyGlobal.prisma.ecommerce_customers.findUnique({
    where: { id: decoded.id },
  });
  if (!customer || customer.deleted_at !== null) {
    throw new HttpException("Customer account not found or deleted", 403);
  }
  // 6. Generate new tokens (SAME session_id for continuity)
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const newAccessToken = jwt.sign(
    {
      id: customer.id,
      type: "customer",
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      id: customer.id,
      type: "customer",
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session with new tokens
  await MyGlobal.prisma.ecommerce_customer_sessions.update({
    where: { id: session.id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpires,
    },
  });
  // 8. Return customer info with new tokens
  return {
    id: customer.id,
    display_name: customer.display_name,
    phone_number: customer.phone_number,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at: customer.deleted_at,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
