import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthGuestJoin(props: {
  ip: string;
  body: ITodoAppGuest.IJoin;
}): Promise<ITodoAppGuest.IAuthorized> {
  // Look up existing guest by unique fingerprint
  const existingGuest = await MyGlobal.prisma.todo_app_guests.findUnique({
    where: { fingerprint: props.body.fingerprint },
  });
  const nowIso = new Date().toISOString();
  // Create or update guest identity
  const guest =
    existingGuest !== null
      ? await MyGlobal.prisma.todo_app_guests.update({
          where: { id: existingGuest.id },
          data: { updated_at: nowIso },
        })
      : await MyGlobal.prisma.todo_app_guests.create({
          data: {
            id: v4(),
            fingerprint: props.body.fingerprint,
            created_at: nowIso,
            updated_at: nowIso,
          },
        });
  // Compute expiration timestamps
  const nowMs = Date.now();
  const accessExpiresIso = new Date(nowMs + 15 * 60 * 1000).toISOString();
  const refreshExpiresIso = new Date(
    nowMs + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const sessionExpiresIso = new Date(nowMs + 24 * 60 * 60 * 1000).toISOString();
  const sessionId = v4();
  // Create guest session
  await MyGlobal.prisma.todo_app_guest_sessions.create({
    data: {
      id: sessionId,
      todo_app_guest_id: guest.id,
      ip: props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowIso,
      expired_at: sessionExpiresIso,
    },
  });
  // Generate JWT token pair
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: sessionId,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };
  return {
    id: guest.id,
    fingerprint: guest.fingerprint,
    created_at: guest.created_at.toISOString(),
    updated_at: guest.updated_at.toISOString(),
    token,
  } satisfies ITodoAppGuest.IAuthorized;
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
// import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postTodoAppAuthGuestJoin(props: {
//   ip: string;
//   body: ITodoAppGuest.IJoin;
// }): Promise<ITodoAppGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------