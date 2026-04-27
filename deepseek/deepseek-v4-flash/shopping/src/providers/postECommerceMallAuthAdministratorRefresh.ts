import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ECommerceMallAdministratorTransformer } from "../transformers/ECommerceMallAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallAuthAdministratorRefresh(props: {
  body: IECommerceMallAdministrator.IRefresh;
}): Promise<IECommerceMallAdministrator.IAuthorized> {
  //----
  // 1. DECODE REFRESH TOKEN
  //----
  interface IJwtRefreshPayload {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: string;
  }
  let decoded: IJwtRefreshPayload;
  try {
    const raw = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    decoded = typia.assert<IJwtRefreshPayload>(raw);
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  //----
  // 2. VALIDATE TOKEN TYPE
  //----
  if (decoded.type !== "administrator") {
    throw new HttpException("Invalid token type", 403);
  }
  //----
  // 3. VALIDATE SESSION EXISTS
  //----
  const session =
    await MyGlobal.prisma.e_commerce_mall_administrator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        e_commerce_mall_administrator_id: decoded.id,
      },
    });
  if (session === null) {
    throw new HttpException("Session not found", 401);
  }
  //----
  // 4. CHECK SESSION HAS NOT EXPIRED — ISO string lexicographic comparison
  //----
  const nowIso = typia.assert<string & tags.Format<"date-time">>(
    new Date(Date.now()).toISOString(),
  );
  const expiredAtIso = typia.assert<string & tags.Format<"date-time">>(
    session.expired_at.toISOString(),
  );
  if (expiredAtIso < nowIso) {
    throw new HttpException("Session has expired", 401);
  }
  //----
  // 5. VERIFY ADMINISTRATOR ACCOUNT IS ACTIVE
  //----
  const admin =
    await MyGlobal.prisma.e_commerce_mall_administrators.findUniqueOrThrow({
      where: { id: decoded.id },
      ...ECommerceMallAdministratorTransformer.select(),
    });
  if (admin.deleted_at !== null) {
    throw new HttpException("Administrator account has been deleted", 403);
  }
  //----
  // 6. GENERATE TIMESTAMPS AS ISO STRINGS
  //----
  const nowMs: number = Date.now();
  const accessExpiresMs: number = nowMs + 60 * 60 * 1000;
  const refreshExpiresMs: number = nowMs + 7 * 24 * 60 * 60 * 1000;
  const createdAtIso = typia.assert<string & tags.Format<"date-time">>(
    new Date(nowMs).toISOString(),
  );
  const accessExpiresAt = typia.assert<string & tags.Format<"date-time">>(
    new Date(accessExpiresMs).toISOString(),
  );
  const refreshExpiresAt = typia.assert<string & tags.Format<"date-time">>(
    new Date(refreshExpiresMs).toISOString(),
  );
  //----
  // 7. GENERATE NEW JWT TOKENS WITH SAME session_id
  //----
  const accessToken: string = jwt.sign(
    {
      type: "administrator",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: createdAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h" as const, issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      type: "administrator",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: createdAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d" as const, issuer: "autobe" },
  );
  //----
  // 8. EXTEND SESSION EXPIRATION
  //----
  await MyGlobal.prisma.e_commerce_mall_administrator_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresAt },
  });
  //----
  // 9. TRANSFORM ADMIN DATA
  //----
  const transformedAdmin: IECommerceMallAdministrator =
    await ECommerceMallAdministratorTransformer.transform(admin);
  //----
  // 10. BUILD AND RETURN RESPONSE
  //----
  return {
    id: transformedAdmin.id,
    email: transformedAdmin.email,
    grade: transformedAdmin.grade,
    created_at: transformedAdmin.created_at,
    updated_at: transformedAdmin.updated_at,
    deleted_at: transformedAdmin.deleted_at,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    } satisfies IAuthorizationToken,
  } satisfies IECommerceMallAdministrator.IAuthorized;
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
// import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallAuthAdministratorRefresh(props: {
//   body: IECommerceMallAdministrator.IRefresh;
// }): Promise<IECommerceMallAdministrator.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------