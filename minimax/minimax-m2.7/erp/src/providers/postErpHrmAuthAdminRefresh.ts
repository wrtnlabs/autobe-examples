import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthAdminRefresh(props: {
  body: IErpHrmAdmin.IRefresh;
}): Promise<IErpHrmAdmin.IAuthorized> {
  // 1. Verify refresh token signature and expiration
  const decoded = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  if (!decoded || typeof decoded !== "object") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Extract payload with proper typing
  const payload = decoded as {
    type?: string;
    id?: string;
    session_id?: string;
  };
  // 2. Validate token type is admin
  if (payload.type !== "admin") {
    throw new HttpException("Invalid token type for admin refresh", 401);
  }
  // 3. Extract required fields from token
  const adminId = payload.id;
  const sessionId = payload.session_id;
  if (!adminId || !sessionId) {
    throw new HttpException("Invalid token payload", 401);
  }
  // 4. Query session to verify it exists and is not expired
  const nowMs = Date.now();
  const session = await MyGlobal.prisma.erp_hrm_admin_sessions.findFirst({
    where: {
      id: sessionId,
      erp_hrm_admin_id: adminId,
      expired_at: {
        gte: new Date(nowMs),
      },
    },
    select: {
      id: true,
      expired_at: true,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 5. Validate admin exists
  const admin = await MyGlobal.prisma.erp_hrm_admins.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_uri: true,
      phone: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!admin) {
    throw new HttpException("Admin account not found", 403);
  }
  // 6. Generate new tokens (SAME session_id for continuity)
  const nowIso = new Date(nowMs).toISOString();
  const accessExpiresMs = nowMs + 60 * 60 * 1000; // 1 hour
  const refreshExpiresMs = nowMs + 7 * 24 * 60 * 60 * 1000; // 7 days
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: sessionId,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session record with new expiration
  await MyGlobal.prisma.erp_hrm_admin_sessions.update({
    where: { id: sessionId },
    data: {
      expired_at: new Date(refreshExpiresMs),
    },
  });
  // 8. Return IErpHrmAdmin.IAuthorized with admin profile and new tokens
  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    avatar_uri: admin.avatar_uri ?? undefined,
    phone: admin.phone ?? undefined,
    created_at: admin.created_at.toISOString(),
    updated_at: admin.updated_at.toISOString(),
    avatarUri: admin.avatar_uri
      ? (admin.avatar_uri as string & tags.Format<"uri">)
      : undefined,
    displayName: admin.display_name,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: new Date(accessExpiresMs).toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: new Date(refreshExpiresMs).toISOString() as string &
        tags.Format<"date-time">,
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
// import { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmAuthAdminRefresh(props: {
//   body: IErpHrmAdmin.IRefresh;
// }): Promise<IErpHrmAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------