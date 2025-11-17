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

export async function postAuthCustomerRefresh(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomer.IRefresh;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  let decoded!: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "customer";
  };
  try {
    decoded = typia.assert(
      jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      }),
    ) as {
      id: string & tags.Format<"uuid">;
      session_id: string & tags.Format<"uuid">;
      type: "customer";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "customer") {
    throw new HttpException("Invalid token type", 403);
  }

  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
      where: {
        id: decoded.session_id,
        shopping_mall_customer_id: decoded.id,
        expired_at: null,
      },
      include: {
        shoppingMallCustomer: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  const customer = session.shoppingMallCustomer;

  if (((customer as any).deleted_at ?? null) !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  const accessExpiresTimestamp = Date.now() + 60 * 60 * 1000;
  const refreshExpiresTimestamp = Date.now() + 7 * 24 * 60 * 60 * 1000;

  const accessExpires = toISOStringSafe(new Date(accessExpiresTimestamp));
  const refreshExpires = toISOStringSafe(new Date(refreshExpiresTimestamp));

  const nowISOString = toISOStringSafe(new Date(Date.now()));

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowISOString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowISOString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });

  return {
    id: customer.id,
    email: customer.email,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
    customer: {
      id: customer.id,
      email: customer.email,
      name: (customer as any).name,
    },
  };
}
