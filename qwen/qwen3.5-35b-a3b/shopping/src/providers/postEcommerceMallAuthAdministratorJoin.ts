import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
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

export async function postEcommerceMallAuthAdministratorJoin(props: {
  ip: string;
  body: IEcommerceMallAdministrator.IJoin;
}): Promise<IEcommerceMallAdministrator.IAuthorized> {
  // 1. Check duplicate email
  const existing =
    await MyGlobal.prisma.ecommerce_mall_administrators.findFirst({
      where: { email: props.body.email },
    });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create administrator account
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const administrator =
    await MyGlobal.prisma.ecommerce_mall_administrators.create({
      data: {
        id: v4(),
        email: props.body.email,
        password_hash: await PasswordUtil.hash(props.body.password),
        display_name: props.body.display_name,
        grade: props.body.grade ?? "regular",
        is_banned: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      select: {
        id: true,
        email: true,
        display_name: true,
        grade: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // 3. Create session record
  const session =
    await MyGlobal.prisma.ecommerce_mall_administrator_sessions.create({
      data: {
        id: v4(),
        administrator_id: administrator.id,
        access_token: "",
        refresh_token: "",
        ip: props.ip,
        href: "",
        referrer: "",
        created_at: new Date(),
        updated_at: new Date(),
        expired_at: accessExpires,
      },
      select: {
        id: true,
      },
    });
  // 4. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  } satisfies IAuthorizationToken;
  // 5. Return IAuthorized response
  return {
    id: administrator.id,
    email: administrator.email,
    display_name: administrator.display_name,
    grade: typia.assert<"regular" | "super">(administrator.grade),
    is_banned: administrator.is_banned,
    created_at: administrator.created_at.toISOString(),
    updated_at: administrator.updated_at.toISOString(),
    deleted_at: administrator.deleted_at?.toISOString() ?? null,
    token,
  } satisfies IEcommerceMallAdministrator.IAuthorized;
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
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthAdministratorJoin(props: {
//   ip: string;
//   body: IEcommerceMallAdministrator.IJoin;
// }): Promise<IEcommerceMallAdministrator.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------