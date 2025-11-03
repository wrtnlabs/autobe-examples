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
  let decoded = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );

  if (typeof decoded === "string") {
    throw new HttpException("Invalid token payload", 403);
  }

  if (
    decoded.type !== "customer" ||
    decoded.id !== props.customer.id ||
    decoded.session_id !== props.customer.session_id
  ) {
    throw new HttpException("Invalid token payload", 403);
  }

  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
      where: {
        id: decoded.session_id,
        shopping_mall_customer_id: decoded.id,
      },
      include: {
        shoppingMallCustomer: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (session.shoppingMallCustomer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  const now_iso = new Date().toISOString();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: now_iso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: now_iso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: toISOStringSafe(refreshExpires) },
  });

  const customer = session.shoppingMallCustomer;

  return {
    id: customer.id,
    email: customer.email,
    nickname: customer.nickname,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at:
      customer.deleted_at !== null
        ? toISOStringSafe(customer.deleted_at)
        : null,
    token: token,
  };
}
