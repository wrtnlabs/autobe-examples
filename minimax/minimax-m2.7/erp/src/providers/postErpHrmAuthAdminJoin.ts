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

export async function postErpHrmAuthAdminJoin(props: {
  ip: string;
  body: IErpHrmAdmin.IJoin;
}): Promise<IErpHrmAdmin.IAuthorized> {
  // 1. Check for duplicate email
  const existingAdmin = await MyGlobal.prisma.erp_hrm_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existingAdmin) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Validate password strength
  if (props.body.password.length < 8) {
    throw new HttpException("Password must be at least 8 characters long", 400);
  }
  // 3. Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  // 4. Generate typed UUIDs and datetime strings
  const adminId = typia.assert<string & tags.Format<"uuid">>(v4());
  const nowIso = typia.assert<string & tags.Format<"date-time">>(
    new Date().toISOString(),
  );
  const accessExpiresIso = typia.assert<string & tags.Format<"date-time">>(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  );
  const refreshExpiresIso = typia.assert<string & tags.Format<"date-time">>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  );
  // 5. Create admin record
  const admin = await MyGlobal.prisma.erp_hrm_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: hashedPassword,
      display_name: props.body.displayName,
      phone: props.body.phone ?? null,
      avatar_uri: props.body.avatarUri ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 6. Create session record
  const sessionId = typia.assert<string & tags.Format<"uuid">>(v4());
  await MyGlobal.prisma.erp_hrm_admin_sessions.create({
    data: {
      id: sessionId,
      erp_hrm_admin_id: adminId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  // 7. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: adminId,
        session_id: sessionId,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "24h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: adminId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };
  // 8. Return IAuthorized response with proper datetime typing
  return {
    id: typia.assert<string & tags.Format<"uuid">>(admin.id),
    email: typia.assert<string & tags.Format<"email">>(admin.email),
    display_name: admin.display_name,
    avatar_uri: admin.avatar_uri,
    phone: admin.phone ?? undefined,
    created_at: typia.assert<string & tags.Format<"date-time">>(
      admin.created_at.toISOString(),
    ),
    updated_at: typia.assert<string & tags.Format<"date-time">>(
      admin.updated_at.toISOString(),
    ),
    avatarUri: admin.avatar_uri
      ? typia.assert<string & tags.Format<"uri">>(admin.avatar_uri)
      : undefined,
    displayName: admin.display_name,
    token: token,
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
// export async function postErpHrmAuthAdminJoin(props: {
//   ip: string;
//   body: IErpHrmAdmin.IJoin;
// }): Promise<IErpHrmAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------