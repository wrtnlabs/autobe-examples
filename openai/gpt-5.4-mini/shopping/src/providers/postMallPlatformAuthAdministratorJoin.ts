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
  const exists = await MyGlobal.prisma.mall_platform_administrators.findFirst({
    where: {
      email: props.body.email,
    },
    select: {
      id: true,
    },
  });
  if (exists !== null)
    throw new HttpException("Administrator already exists", 409);
  const password_hash = await PasswordUtil.hash(props.body.password);
  const createdAt = toISOStringSafe(new Date());
  const sessionId = v4();
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const administrator =
    await MyGlobal.prisma.mall_platform_administrators.create({
      data: {
        id: v4(),
        email: props.body.email,
        password_hash,
        grade: "regular",
        status: "active",
        created_at: createdAt,
        updated_at: createdAt,
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
  const token = {
    access: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: sessionId,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshableUntil,
  } satisfies IAuthorizationToken;
  return {
    id: administrator.id,
    email: administrator.email,
    grade: administrator.grade,
    status: administrator.status,
    created_at: administrator.created_at.toISOString(),
    updated_at: administrator.updated_at.toISOString(),
    deleted_at:
      administrator.deleted_at === null
        ? null
        : administrator.deleted_at.toISOString(),
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