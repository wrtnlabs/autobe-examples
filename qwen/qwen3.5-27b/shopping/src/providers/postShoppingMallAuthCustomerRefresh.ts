import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthCustomerRefresh(props: {
  body: IShoppingMallCustomer.IRefresh;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const decoded = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  ) as {
    id: string;
    session_id: string;
    type: string;
  };
  if (decoded.type !== "customer") {
    throw new HttpException("Invalid token type", 403);
  }
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
      where: {
        id: decoded.session_id,
        shopping_mall_customer_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (customer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (customer.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "customer",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "customer",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  return {
    id: customer.id as string & tags.Format<"uuid">,
    email: customer.email as string & tags.Format<"email">,
    display_name: customer.display_name,
    phone_number: customer.phone_number,
    status: customer.status,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
