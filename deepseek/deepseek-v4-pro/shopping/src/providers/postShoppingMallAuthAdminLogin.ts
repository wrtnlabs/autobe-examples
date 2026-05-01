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
import { ShoppingMallAdminTransformer } from "../transformers/ShoppingMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdminLogin(props: {
  ip: string;
  body: IShoppingMallAdmin.ILogin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  // 1. Find admin by email, excluding soft-deleted accounts
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      ...ShoppingMallAdminTransformer.select().select,
      password_hash: true,
    },
  });
  if (!admin) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Create NEW session
  const sessionId = v4();
  const now = new Date().toISOString();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_admin_id: admin.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 4. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  } satisfies IAuthorizationToken;
  // 5. Return IAuthorized
  return {
    ...(await ShoppingMallAdminTransformer.transform(admin)),
    token,
  } satisfies IShoppingMallAdmin.IAuthorized;
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
// export async function postShoppingMallAuthAdminLogin(props: {
//   ip: string;
//   body: IShoppingMallAdmin.ILogin;
// }): Promise<IShoppingMallAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------