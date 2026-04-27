import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ECommerceMallCustomerProfileTransformer } from "../transformers/ECommerceMallCustomerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallAuthCustomerRefresh(props: {
  body: IECommerceMallCustomer.IRefresh;
}): Promise<IECommerceMallCustomer.IAuthorized> {
  // 1. Verify the refresh token JWT
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    const raw: unknown = jwt.verify(
      props.body.token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (typeof raw !== "object" || raw === null) {
      throw new HttpException("Invalid token payload", 401);
    }
    const id: unknown = Reflect.get(raw, "id");
    const sessionId: unknown = Reflect.get(raw, "session_id");
    const type: unknown = Reflect.get(raw, "type");
    if (
      typeof id !== "string" ||
      typeof sessionId !== "string" ||
      typeof type !== "string"
    ) {
      throw new HttpException("Invalid token payload", 401);
    }
    decoded = { id, session_id: sessionId, type };
  } catch (err) {
    if (err instanceof HttpException) {
      throw err;
    }
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type is customer
  if (decoded.type !== "customer") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and is not expired
  const nowIso: string = toISOStringSafe(new Date());
  const session =
    await MyGlobal.prisma.e_commerce_mall_customer_sessions.findFirst({
      where: {
        id: decoded.session_id,
        e_commerce_mall_customer_id: decoded.id,
        expired_at: { gt: nowIso },
      },
    });
  if (session === null) {
    throw new HttpException("Session expired or not found", 401);
  }
  // 4. Validate customer exists, is not deleted or banned
  const customer =
    await MyGlobal.prisma.e_commerce_mall_customers.findUniqueOrThrow({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        banned_at: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        profile: ECommerceMallCustomerProfileTransformer.select(),
      },
    });
  if (customer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (customer.banned_at !== null) {
    throw new HttpException("Account is banned", 403);
  }
  // 5. Generate new tokens with SAME session_id
  const nowMs: number = Date.now();
  const accessExpiresAt: string = toISOStringSafe(
    new Date(nowMs + 60 * 60 * 1000),
  );
  const refreshExpiresAt: string = toISOStringSafe(
    new Date(nowMs + 7 * 24 * 60 * 60 * 1000),
  );
  const nowIsoForToken: string = toISOStringSafe(new Date(nowMs));
  const accessToken: string = jwt.sign(
    {
      type: "customer",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIsoForToken,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      type: "customer",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowIsoForToken,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expired_at
  await MyGlobal.prisma.e_commerce_mall_customer_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: refreshExpiresAt,
    },
  });
  // 7. Profile is auto-created during registration (1:1), so it always exists
  if (customer.profile === null) {
    throw new HttpException("Customer profile not found", 500);
  }
  // 8. Build and return response
  return {
    id: customer.id,
    email: customer.email,
    profile: await ECommerceMallCustomerProfileTransformer.transform(
      customer.profile,
    ),
    banned_at: null,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
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
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallAuthCustomerRefresh(props: {
//   body: IECommerceMallCustomer.IRefresh;
// }): Promise<IECommerceMallCustomer.IAuthorized> {
//   return {
//     id: ...,
//     email: ...,
//     profile: await ECommerceMallCustomerProfileTransformer.transform(...),
//     banned_at: ...,
//     created_at: ...,
//     updated_at: ...,
//     deleted_at: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------