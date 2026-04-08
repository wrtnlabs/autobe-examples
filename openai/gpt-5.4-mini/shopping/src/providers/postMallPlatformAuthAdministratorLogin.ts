import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformAuthAdministratorLogin(props: {
  ip: string;
  body: IMallPlatformAdministrator.ILogin;
}): Promise<IMallPlatformAdministrator.IAuthorized> {
  const administrator =
    await MyGlobal.prisma.mall_platform_administrators.findFirst({
      where: {
        email: props.body.email,
      },
      select: {
        id: true,
        email: true,
        grade: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        password_hash: true,
      },
    });
  if (administrator === null)
    throw new HttpException("Invalid credentials", 401);
  const verified = await PasswordUtil.verify(
    props.body.password,
    administrator.password_hash,
  );
  if (verified === false) throw new HttpException("Invalid credentials", 401);
  if (administrator.status !== "active")
    throw new HttpException("Invalid credentials", 401);
  const sessionId = v4();
  const issuedAt = toISOStringSafe(new globalThis.Date());
  const accessExpiredAt = toISOStringSafe(
    new globalThis.Date(globalThis.Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new globalThis.Date(globalThis.Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.mall_platform_administrator_sessions.create({
    data: {
      id: sessionId,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: issuedAt,
      expired_at: accessExpiredAt,
      administrator_id: administrator.id,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: sessionId,
        created_at: issuedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
        expiresIn: "1h",
      },
    ),
    refresh: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: issuedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
        expiresIn: "7d",
      },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshableUntil,
  };
  return {
    id: administrator.id,
    email: administrator.email,
    grade: administrator.grade,
    status: administrator.status,
    created_at: toISOStringSafe(administrator.created_at),
    updated_at: toISOStringSafe(administrator.updated_at),
    deleted_at:
      administrator.deleted_at === null
        ? null
        : toISOStringSafe(administrator.deleted_at),
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
// import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformAuthAdministratorLogin(props: {
//   ip: string;
//   body: IMallPlatformAdministrator.ILogin;
// }): Promise<IMallPlatformAdministrator.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------