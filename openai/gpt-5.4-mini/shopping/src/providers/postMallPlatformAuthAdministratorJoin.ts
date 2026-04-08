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

export async function postMallPlatformAuthAdministratorJoin(props: {
  ip: string;
  body: IMallPlatformAdministrator.IJoin;
}): Promise<IMallPlatformAdministrator.IAuthorized> {
  const existing =
    await MyGlobal.prisma.mall_platform_administrators.findUnique({
      where: { email: props.body.email },
      select: { id: true },
    });
  if (existing !== null)
    throw new HttpException("Administrator email already exists", 409);
  const createdAtText = new Date().toISOString();
  const sessionExpiredAtText = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const administratorId = v4();
  const sessionId = v4();
  const administrator =
    await MyGlobal.prisma.mall_platform_administrators.create({
      data: {
        id: administratorId,
        email: props.body.email,
        password_hash: passwordHash,
        grade: "regular",
        status: "active",
        created_at: new Date(createdAtText),
        updated_at: new Date(createdAtText),
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        grade: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const session =
    await MyGlobal.prisma.mall_platform_administrator_sessions.create({
      data: {
        id: sessionId,
        administrator_id: administrator.id,
        ip: props.ip,
        href: props.ip,
        referrer: props.ip,
        created_at: new Date(createdAtText),
        expired_at: new Date(sessionExpiredAtText),
      },
      select: {
        id: true,
        created_at: true,
        expired_at: true,
      },
    });
  return {
    id: administrator.id,
    email: administrator.email,
    grade: administrator.grade,
    status: administrator.status,
    createdAt: administrator.created_at.toISOString(),
    updatedAt: administrator.updated_at.toISOString(),
    deletedAt:
      administrator.deleted_at === null
        ? null
        : administrator.deleted_at.toISOString(),
    token: {
      access: jwt.sign(
        {
          type: "administrator",
          id: administrator.id,
          session_id: session.id,
          created_at: createdAtText,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "administrator",
          id: administrator.id,
          session_id: session.id,
          created_at: createdAtText,
          tokenType: "refresh",
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: session.created_at.toISOString(),
      refreshable_until: session.expired_at.toISOString(),
    } satisfies IAuthorizationToken,
  } satisfies IMallPlatformAdministrator.IAuthorized;
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
// export async function postMallPlatformAuthAdministratorJoin(props: {
//   ip: string;
//   body: IMallPlatformAdministrator.IJoin;
// }): Promise<IMallPlatformAdministrator.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------