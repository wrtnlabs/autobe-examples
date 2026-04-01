import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "customer";
  };
  try {
    const verified = jwt.verify(
      props.body.refresh,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    decoded = typia.assert<{
      id: string;
      session_id: string;
      type: "customer";
    }>(verified);
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "customer") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists
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
  // 4. Validate customer account is active
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (customer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens (SAME session_id)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpiresStr = toISOStringSafe(accessExpires);
  const refreshExpiresStr = toISOStringSafe(refreshExpires);
  const accessToken = jwt.sign(
    {
      type: "customer" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "customer" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh" as const,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session with new tokens and expiration
  await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expired_at: refreshExpires,
    },
  });
  // 7. Fetch customer with profile
  const customerWithProfile =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: decoded.id },
      include: {
        profile: true,
      },
    });
  // 8. Build profile with transformed customer (snake_case to camelCase for nested profile)
  const profile: IShoppingMallCustomerProfile = customerWithProfile.profile
    ? {
        id: customerWithProfile.profile.id,
        display_name: customerWithProfile.profile.display_name,
        phone_number: customerWithProfile.profile.phone_number,
        created_at: toISOStringSafe(customerWithProfile.profile.created_at),
        updated_at: toISOStringSafe(customerWithProfile.profile.updated_at),
        deleted_at: customerWithProfile.profile.deleted_at
          ? toISOStringSafe(customerWithProfile.profile.deleted_at)
          : null,
        customer: {
          id: customerWithProfile.id,
          email: customerWithProfile.email,
          created_at: toISOStringSafe(customerWithProfile.created_at),
          deleted_at: customerWithProfile.deleted_at
            ? toISOStringSafe(customerWithProfile.deleted_at)
            : null,
          profile: customerWithProfile.profile
            ? {
                id: customerWithProfile.profile.id,
                displayName: customerWithProfile.profile.display_name,
                phoneNumber: customerWithProfile.profile.phone_number,
              }
            : null,
        },
      }
    : {
        id: "",
        display_name: "",
        phone_number: "",
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
        customer: {
          id: customerWithProfile.id,
          email: customerWithProfile.email,
          created_at: toISOStringSafe(customerWithProfile.created_at),
          deleted_at: customerWithProfile.deleted_at
            ? toISOStringSafe(customerWithProfile.deleted_at)
            : null,
          profile: null,
        },
      };
  return {
    id: customerWithProfile.id,
    email: customerWithProfile.email,
    profile: profile,
    created_at: toISOStringSafe(customerWithProfile.created_at),
    updated_at: toISOStringSafe(customerWithProfile.updated_at),
    deleted_at: customerWithProfile.deleted_at
      ? toISOStringSafe(customerWithProfile.deleted_at)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresStr,
      refreshable_until: refreshExpiresStr,
    } satisfies IAuthorizationToken,
  } satisfies IShoppingMallCustomer.IAuthorized;
}
