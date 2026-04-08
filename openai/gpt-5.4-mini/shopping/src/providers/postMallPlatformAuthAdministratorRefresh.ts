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

export async function postMallPlatformAuthAdministratorRefresh(props: {
  body: IMallPlatformAdministrator.IRefresh;
}): Promise<IMallPlatformAdministrator.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: "administrator";
    created_at: string;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "administrator";
      created_at: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "administrator") {
    throw new HttpException("Invalid token type", 403);
  }
  const now = new Date();
  const accessExpiredAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpiredAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.mall_platform_administrator_sessions.findFirstOrThrow(
      {
        where: {
          id: decoded.session_id,
          administrator: {
            id: decoded.id,
          },
          expired_at: {
            gt: now,
          },
        },
        select: {
          id: true,
        },
      },
    );
  const administrator =
    await MyGlobal.prisma.mall_platform_administrators.findUniqueOrThrow({
      where: { id: decoded.id },
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
  if (administrator.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (administrator.status !== "active") {
    throw new HttpException(
      "Account is not permitted to access the platform",
      403,
    );
  }
  const tokenPayload = {
    id: administrator.id,
    session_id: session.id,
    type: "administrator" as const,
    created_at: now.toISOString(),
  };
  const access = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
    expiresIn: "1h",
  });
  const refresh = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
    expiresIn: "7d",
  });
  await MyGlobal.prisma.mall_platform_administrator_sessions.update({
    where: { id: session.id },
    data: {
      expired_at: refreshExpiredAt,
    },
  });
  return {
    id: administrator.id,
    email: administrator.email,
    grade: administrator.grade,
    status: administrator.status,
    createdAt: administrator.created_at.toISOString(),
    updatedAt: administrator.updated_at.toISOString(),
    deletedAt: null,
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt.toISOString(),
      refreshable_until: refreshExpiredAt.toISOString(),
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
// import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformAuthAdministratorRefresh(props: {
//   body: IMallPlatformAdministrator.IRefresh;
// }): Promise<IMallPlatformAdministrator.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------