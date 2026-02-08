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
  const refreshToken = (props.body as any).refreshToken;
  if (typeof refreshToken !== "string" || refreshToken.length === 0) {
    throw new HttpException("refreshToken is required", 400);
  }
  let decoded: unknown;
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof (decoded as any).type !== "string" ||
    typeof (decoded as any).id !== "string" ||
    typeof (decoded as any).session_id !== "string"
  ) {
    throw new HttpException("Invalid token payload", 401);
  }
  const tokenPayload = decoded as {
    type: string;
    id: string;
    session_id: string;
  };
  if (tokenPayload.type !== "customer") {
    throw new HttpException("Invalid token type", 403);
  }
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
      where: {
        id: tokenPayload.session_id,
        shopping_mall_customer_id: tokenPayload.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: tokenPayload.id },
    select: { deleted_at: true },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }
  if (customer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const nowStr = toISOStringSafe(new Date());
  const accessExpireStr = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpireStr = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const token = {
    access: jwt.sign(
      {
        type: tokenPayload.type,
        id: tokenPayload.id,
        session_id: tokenPayload.session_id,
        created_at: nowStr,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: tokenPayload.type,
        id: tokenPayload.id,
        session_id: tokenPayload.session_id,
        tokenType: "refresh",
        created_at: nowStr,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpireStr,
    refreshable_until: refreshExpireStr,
  };
  await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: { id: tokenPayload.session_id },
    data: { expired_at: refreshExpireStr },
  });
  return { token };
}
