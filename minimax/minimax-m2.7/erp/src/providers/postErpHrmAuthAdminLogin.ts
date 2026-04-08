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

export async function postErpHrmAuthAdminLogin(props: {
  ip: string;
  body: IErpHrmAdmin.ILogin;
}): Promise<IErpHrmAdmin.IAuthorized> {
  // 1. Find admin by email with password_hash explicitly selected
  const admin = await MyGlobal.prisma.erp_hrm_admins.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      display_name: true,
      avatar_uri: true,
      phone: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Generate UUIDs and timestamps
  const sessionId = v4();
  const nowIso = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  const accessExpiresIso = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshExpiresIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  // 4. Create new session
  const session = await MyGlobal.prisma.erp_hrm_admin_sessions.create({
    data: {
      id: sessionId,
      erp_hrm_admin_id: admin.id,
      ip: props.ip ?? props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };
  // 6. Return authorized response
  return {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email as string & tags.Format<"email">,
    display_name: admin.display_name,
    avatar_uri: admin.avatar_uri,
    phone: admin.phone ?? undefined,
    created_at: toISOStringSafe(admin.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(admin.updated_at) as string &
      tags.Format<"date-time">,
    avatarUri: admin.avatar_uri
      ? (admin.avatar_uri as string & tags.Format<"uri">)
      : undefined,
    displayName: admin.display_name,
    token,
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
// export async function postErpHrmAuthAdminLogin(props: {
//   ip: string;
//   body: IErpHrmAdmin.ILogin;
// }): Promise<IErpHrmAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------