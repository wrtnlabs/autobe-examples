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

export async function postShoppingMallAuthAdminJoin(props: {
  ip: string;
  body: IShoppingMallAdmin.IJoin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  const existingAdmin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (existingAdmin !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const adminId = typia.assert<string & tags.Format<"uuid">>(v4());
  const sessionId = typia.assert<string & tags.Format<"uuid">>(v4());
  const now = typia.assert<string & tags.Format<"date-time">>(
    new Date().toISOString(),
  );
  const accessExpires = typia.assert<string & tags.Format<"date-time">>(
    new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  );
  const refreshExpires = typia.assert<string & tags.Format<"date-time">>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  );
  const passwordHash = await PasswordUtil.hash(props.body.password);
  await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: passwordHash,
      grade: "regular",
      created_at: now,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: sessionId,
      admin: { connect: { id: adminId } },
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: adminId,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: adminId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    id: adminId,
    email: props.body.email,
    grade: "regular",
    created_at: now,
    updated_at: now,
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
// import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAuthAdminJoin(props: {
//   ip: string;
//   body: IShoppingMallAdmin.IJoin;
// }): Promise<IShoppingMallAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------