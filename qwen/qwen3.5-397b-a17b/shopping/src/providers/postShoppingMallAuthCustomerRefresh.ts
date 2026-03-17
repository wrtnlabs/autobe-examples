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
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: string;
  };
  try {
    const verified = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    decoded = verified as {
      id: string & tags.Format<"uuid">;
      session_id: string & tags.Format<"uuid">;
      type: string;
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
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpiresStr = toISOStringSafe(accessExpires);
  const refreshExpiresStr = toISOStringSafe(refreshExpires);
  const createdAtStr = toISOStringSafe(new Date());
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "customer",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: createdAtStr,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: createdAtStr,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresStr,
    refreshable_until: refreshExpiresStr,
  };
  await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  const deletedAtStr: (string & tags.Format<"date-time">) | null =
    customer.deleted_at === null ? null : toISOStringSafe(customer.deleted_at);
  const createdAtCustomerStr = toISOStringSafe(customer.created_at);
  const updatedAtStr = toISOStringSafe(customer.updated_at);
  return {
    id: customer.id,
    email: customer.email,
    nickname: customer.nickname,
    phone_number: customer.phone_number,
    created_at: createdAtCustomerStr,
    updated_at: updatedAtStr,
    deleted_at: deletedAtStr,
    customer: {
      id: customer.id,
      email: customer.email,
      nickname: customer.nickname,
      phone_number: customer.phone_number,
      created_at: createdAtCustomerStr,
      deleted_at: deletedAtStr,
    } satisfies IShoppingMallCustomer.ISummary,
    token: token,
  };
}
