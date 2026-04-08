import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function postEcommerceMallAuthSellerRefresh(props: {
  body: IEcommerceMallSeller.IRefresh;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  // 1. Verify refresh token signature and decode payload
  const decodedToken: {
    id: string;
    session_id: string;
    type: "seller";
  } = jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as {
    id: string;
    session_id: string;
    type: "seller";
  };
  // 2. Find session and validate it exists and is not deleted
  const session =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.findFirst({
      where: {
        id: decodedToken.session_id,
        ecommerce_mall_seller_id: decodedToken.id,
        deleted_at: null,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 3. Check token expiration
  const now = new Date();
  const expiredAt = new Date(session.expired_at);
  if (now >= expiredAt) {
    throw new HttpException("Refresh token expired", 401);
  }
  // 4. Validate seller account status
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: decodedToken.id },
    },
  );
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (seller.is_suspended === true) {
    throw new HttpException("Account is suspended", 403);
  }
  if (seller.approval_status !== "approved") {
    throw new HttpException("Account is not approved", 403);
  }
  // 5. Generate new tokens (reuse session_id for continuity)
  const accessExpiresDate = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const access = jwt.sign(
    {
      type: "seller",
      id: decodedToken.id,
      session_id: decodedToken.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "seller",
      id: decodedToken.id,
      session_id: decodedToken.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Create new session record with new tokens
  const newSessionId = v4();
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: newSessionId,
      ecommerce_mall_seller_id: decodedToken.id,
      access_token: access,
      refresh_token: refresh,
      ip: "0.0.0.0",
      href: "",
      referrer: "",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      expired_at: refreshExpiresDate,
    },
  });
  // 7. Mark old session as deleted for audit trail
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.update({
    where: { id: decodedToken.session_id },
    data: { deleted_at: new Date() },
  });
  // 8. Return IAuthorized response with seller details and new tokens
  return {
    id: seller.id,
    email: seller.email,
    display_name: seller.display_name,
    approval_status: seller.approval_status,
    rejection_reason: seller.rejection_reason,
    is_suspended: seller.is_suspended,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at:
      seller.deleted_at !== null ? toISOStringSafe(seller.deleted_at) : null,
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpiresDate),
      refreshable_until: toISOStringSafe(refreshExpiresDate),
    },
  } satisfies IEcommerceMallSeller.IAuthorized;
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
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthSellerRefresh(props: {
//   body: IEcommerceMallSeller.IRefresh;
// }): Promise<IEcommerceMallSeller.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------