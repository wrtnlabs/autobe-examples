import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCustomerRefresh(props: {
  body: IShoppingMallCustomer.IRefresh;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  let decoded: { id: string; session_id: string; type: string };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: string };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "customer") {
    throw new HttpException("Token does not match customer type", 403);
  }
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findUnique({
      where: { id: decoded.session_id },
    });
  if (!session || session.shopping_mall_customer_id !== decoded.id) {
    throw new HttpException(
      "Session does not exist or does not match customer",
      401,
    );
  }
  if (
    session.expired_at !== null &&
    new Date(session.expired_at).getTime() < Date.now()
  ) {
    throw new HttpException("Session expired", 401);
  }
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: decoded.id },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }

  const now = Date.now();
  const accessExpireIso = toISOStringSafe(new Date(now + 60 * 60 * 1000));
  const refreshExpireIso = toISOStringSafe(
    new Date(now + 7 * 24 * 60 * 60 * 1000),
  );
  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date(now)),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date(now)),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpireIso,
    refreshable_until: refreshExpireIso,
  };

  await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: { id: session.id },
    data: { expired_at: refreshExpireIso },
  });

  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    is_email_verified: customer.is_email_verified,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    token,
  };
}
