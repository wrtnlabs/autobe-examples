import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
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

export async function postEcommercePlatformAuthCustomerRefresh(props: {
  body: IEcommercePlatformCustomer.IRefresh;
}): Promise<IEcommercePlatformCustomer.IAuthorized> {
  let payload: {
    type: string;
    id: string;
    session_id: string;
  };
  try {
    payload = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      type: string;
      id: string;
      session_id: string;
    };
  } catch {
    throw new HttpException("Invalid refresh token", 401);
  }
  if (payload.type !== "customer") {
    throw new HttpException("Invalid token type", 401);
  }
  const sessionHash: string = await PasswordUtil.hash(props.body.refreshToken);
  const session =
    await MyGlobal.prisma.ecommerce_platform_customer_sessions.findFirst({
      where: {
        id: payload.session_id,
        ecommerce_platform_customer_id: payload.id,
        refresh_token_hash: sessionHash,
        deleted_at: null,
        expired_at: { gt: new Date() },
      },
      select: { id: true },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const customer =
    await MyGlobal.prisma.ecommerce_platform_customers.findUniqueOrThrow({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customerProfile: {
          select: {
            id: true,
            display_name: true,
            phone_number: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                is_banned: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  if (customer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (customer.is_banned) {
    throw new HttpException("Account is banned", 403);
  }
  const now = toISOStringSafe(new Date()) satisfies string as string;
  const accessExpire = toISOStringSafe(
    new Date(Date.now() + 900000),
  ) satisfies string as string;
  const refreshExpire = toISOStringSafe(
    new Date(Date.now() + 604800000),
  ) satisfies string as string;
  const newAccessToken: string = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      session_id: payload.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const newRefreshToken: string = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      session_id: payload.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const newSessionHash: string = await PasswordUtil.hash(newRefreshToken);
  await MyGlobal.prisma.ecommerce_platform_customer_sessions.update({
    where: { id: session.id },
    data: {
      refresh_token_hash: newSessionHash,
      expired_at: new Date(refreshExpire),
      updated_at: new Date(now),
    },
  });
  return {
    id: customer.id,
    email: customer.email,
    is_banned: customer.is_banned,
    created_at: toISOStringSafe(customer.created_at) satisfies string as string,
    updated_at: toISOStringSafe(customer.updated_at) satisfies string as string,
    deleted_at: null,
    customer_profile: customer.customerProfile
      ? ({
          id: customer.customerProfile.id,
          display_name: customer.customerProfile.display_name,
          phone_number: customer.customerProfile.phone_number,
          created_at: toISOStringSafe(
            customer.customerProfile.created_at,
          ) satisfies string as string,
          updated_at: toISOStringSafe(
            customer.customerProfile.updated_at,
          ) satisfies string as string,
          deleted_at:
            customer.customerProfile.deleted_at !== null
              ? (toISOStringSafe(
                  customer.customerProfile.deleted_at,
                ) satisfies string as string)
              : null,
          customer: {
            id: customer.customerProfile.customer.id,
            email: customer.customerProfile.customer.email,
            is_banned: customer.customerProfile.customer.is_banned,
            created_at: toISOStringSafe(
              customer.customerProfile.customer.created_at,
            ) satisfies string as string,
            updated_at: toISOStringSafe(
              customer.customerProfile.customer.updated_at,
            ) satisfies string as string,
            deleted_at:
              customer.customerProfile.customer.deleted_at !== null
                ? (toISOStringSafe(
                    customer.customerProfile.customer.deleted_at,
                  ) satisfies string as string)
                : null,
          } satisfies IEcommercePlatformCustomer.ISummary,
        } satisfies IEcommercePlatformCustomerProfile)
      : null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpire satisfies string as string,
      refreshable_until: refreshExpire satisfies string as string,
    } satisfies IAuthorizationToken,
  } satisfies IEcommercePlatformCustomer.IAuthorized;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// import { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformAuthCustomerRefresh(props: {
//   body: IEcommercePlatformCustomer.IRefresh;
// }): Promise<IEcommercePlatformCustomer.IAuthorized> {
//   return {
//     created_at: ...,
//     customer_profile: await EcommercePlatformCustomerProfileTransformer.transform(...),
//     deleted_at: ...,
//     email: ...,
//     id: ...,
//     is_banned: ...,
//     updated_at: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------