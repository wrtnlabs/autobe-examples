import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdminRefresh(props: {
  body: IShoppingMallAdmin.IRefresh;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  // 1. Verify and decode refresh token
  let payload: jwt.JwtPayload;
  try {
    const result = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
    if (typeof result === "string") {
      throw new HttpException("Invalid refresh token", 401);
    }
    payload = result;
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (payload.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }
  const sessionId: string = payload.session_id;
  const adminId: string = payload.id;
  // 3. Validate session exists
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst({
    where: {
      id: sessionId,
      shopping_mall_admin_id: adminId,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Check session absolute expiration
  const nowMs = Date.now();
  if (session.expired_at.getTime() < nowMs) {
    throw new HttpException(
      "Session expired — token cannot be refreshed beyond its absolute expiration",
      401,
    );
  }
  // 5. Validate admin is not soft-deleted
  const admin = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: adminId },
  });
  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been deactivated", 401);
  }
  // 6. Generate new tokens (SAME session_id)
  const accessExpiresMs = Date.now() + 60 * 60 * 1000;
  const refreshExpiresMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: adminId,
      session_id: sessionId,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: adminId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.shopping_mall_admin_sessions.update({
    where: { id: sessionId },
    data: { expired_at: new Date(refreshExpiresMs) },
  });
  // 8. Return authorized response
  return {
    id: admin.id,
    email: admin.email,
    grade: admin.grade,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(accessExpiresMs)),
      refreshable_until: toISOStringSafe(new Date(refreshExpiresMs)),
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
// import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAuthAdminRefresh(props: {
//   body: IShoppingMallAdmin.IRefresh;
// }): Promise<IShoppingMallAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------