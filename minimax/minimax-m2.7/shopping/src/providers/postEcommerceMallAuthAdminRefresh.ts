import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

export async function postEcommerceMallAuthAdminRefresh(props: {
  body: IEcommerceMallAdmin.IRefresh;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
  // 1. Verify refresh token signature and expiration
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate session exists and is active
  const session = await MyGlobal.prisma.ecommerce_mall_admin_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        ecommerce_mall_admin_id: decoded.id,
      },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 3. Validate admin exists and is not soft-deleted
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // After the guard above, admin.deleted_at is always null
  // 4. Generate new tokens with SAME session_id (token rotation)
  const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const tokenData: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpiresAt),
    refreshable_until: toISOStringSafe(refreshExpiresAt),
  };
  // 5. Update session with new expiration
  await MyGlobal.prisma.ecommerce_mall_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresAt },
  });
  // 6. Return authorized response with admin profile and tokens
  return {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email as string & tags.Format<"email">,
    name: admin.name,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: null,
    token: tokenData,
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
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthAdminRefresh(props: {
//   body: IEcommerceMallAdmin.IRefresh;
// }): Promise<IEcommerceMallAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------