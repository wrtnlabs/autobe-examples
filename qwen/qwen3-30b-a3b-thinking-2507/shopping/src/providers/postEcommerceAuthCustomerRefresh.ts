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
  try {
    const token = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    ) as {
      id: string;
      session_id: string;
      type: string;
    };
    if (token.type !== "customer") {
      throw new HttpException("Invalid token type", 403);
    }
    let decoded = token;
    const session = await MyGlobal.prisma.ecommerce_customer_sessions.findFirst(
      {
        where: {
          id: decoded.session_id,
          customer_id: decoded.id,
        },
      },
    );
    if (!session) {
      throw new HttpException("Session expired or revoked", 401);
    }
    const customer =
      await MyGlobal.prisma.ecommerce_customers.findUniqueOrThrow({
        where: { id: decoded.id },
      });
    if (customer.deleted_at !== null) {
      throw new HttpException("Account has been deleted", 403);
    }
    const accessExpires = new Date(Date.now() + 30 * 60 * 1000);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const tokenData = {
      access: jwt.sign(
        {
          type: "customer",
          id: decoded.id,
          session_id: decoded.session_id,
          created_at: toISOStringSafe(accessExpires),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "30m", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "customer",
          id: decoded.id,
          session_id: decoded.session_id,
          created_at: toISOStringSafe(refreshExpires),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    };
    await MyGlobal.prisma.ecommerce_customer_sessions.update({
      where: { id: decoded.session_id },
      data: { expired_at: refreshExpires },
    });
    return {
      id: customer.id,
      email: customer.email,
      email_verified: customer.email_verified,
      is_suspended: customer.is_suspended,
      created_at: toISOStringSafe(customer.created_at),
      updated_at: toISOStringSafe(customer.updated_at),
      deleted_at: customer.deleted_at
        ? toISOStringSafe(customer.deleted_at)
        : null,
      token: {
        access: tokenData.access,
        refresh: tokenData.refresh,
        expired_at: tokenData.expired_at,
        refreshable_until: tokenData.refreshable_until,
      },
    };
  } finally {
  }
}
