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

export async function postEcommerceMallAuthAdministratorRefresh(props: {
  body: IEcommerceMallAdministrator.IRefresh;
}): Promise<IEcommerceMallAdministrator.IAuthorized> {
  // 1. Verify refresh token
  const decoded = typia.assert<{
    type: "administrator";
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
  }>(
    jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }),
  );
  // 2. Validate token type
  if (decoded.type !== "administrator") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists and is not deleted
  const session =
    await MyGlobal.prisma.ecommerce_mall_administrator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        administrator_id: decoded.id,
        deleted_at: null,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate session has not expired
  if (session.expired_at < new Date()) {
    throw new HttpException("Session has expired", 401);
  }
  // 5. Validate administrator exists and is not banned
  const administrator =
    await MyGlobal.prisma.ecommerce_mall_administrators.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (administrator.is_banned) {
    throw new HttpException("Administrator account is banned", 403);
  }
  if (administrator.deleted_at !== null) {
    throw new HttpException("Administrator account has been deleted", 403);
  }
  // 6. Generate new tokens with string timestamps
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const accessToken = jwt.sign(
    {
      type: "administrator" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  ) as string;
  const refreshToken = jwt.sign(
    {
      type: "administrator" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh" as const,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  ) as string;
  // 7. Update session with new tokens and expiration
  await MyGlobal.prisma.ecommerce_mall_administrator_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expired_at: new Date(refreshExpires),
    },
  });
  // 8. Return authorized response with proper typing
  return {
    id: decoded.id,
    email: administrator.email,
    display_name: administrator.display_name,
    grade: administrator.grade as "regular" | "super",
    is_banned: administrator.is_banned,
    created_at: toISOStringSafe(administrator.created_at),
    updated_at: toISOStringSafe(administrator.updated_at),
    deleted_at: administrator.deleted_at
      ? toISOStringSafe(administrator.deleted_at)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
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
// export async function postEcommerceMallAuthAdministratorRefresh(props: {
//   body: IEcommerceMallAdministrator.IRefresh;
// }): Promise<IEcommerceMallAdministrator.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------