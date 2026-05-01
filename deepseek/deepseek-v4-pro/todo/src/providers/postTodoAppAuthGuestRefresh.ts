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

export async function postTodoAppAuthGuestRefresh(props: {
  body: ITodoAppGuest.IRefresh;
}): Promise<ITodoAppGuest.IAuthorized> {
  // 1. Decode and verify refresh token
  let decoded: {
    sub: string;
    session_id: string;
    kind: string;
    type: string;
  };
  try {
    const raw = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (typeof raw === "string") {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
    if (
      typeof raw.sub !== "string" ||
      typeof raw.session_id !== "string" ||
      typeof raw.kind !== "string" ||
      typeof raw.type !== "string"
    ) {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
    decoded = {
      sub: raw.sub,
      session_id: raw.session_id,
      kind: raw.kind,
      type: raw.type,
    };
  } catch (err: unknown) {
    if (err instanceof HttpException) {
      throw err;
    }
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type claims
  if (decoded.kind !== "guest" || decoded.type !== "refresh") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Verify guest exists
  const guest = await MyGlobal.prisma.todo_app_guests.findUnique({
    where: { id: decoded.sub },
    select: {
      id: true,
      fingerprint: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (guest === null) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 4. Verify old session exists and belongs to this guest
  const oldSession = await MyGlobal.prisma.todo_app_guest_sessions.findUnique({
    where: { id: decoded.session_id },
    select: {
      id: true,
      todo_app_guest_id: true,
      expired_at: true,
    },
  });
  if (oldSession === null || oldSession.todo_app_guest_id !== decoded.sub) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 5. Check session has not expired (compare ISO strings)
  const nowStr: string = new Date(Date.now()).toISOString();
  if (oldSession.expired_at.toISOString() < nowStr) {
    throw new HttpException("Session has expired — re-join required", 401);
  }
  // 6. Create new session
  const newSessionId: string = v4();
  const nowMs: number = Date.now();
  const createdAt: string = new Date(nowMs).toISOString();
  const refreshExpiresAt: string = new Date(
    nowMs + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  await MyGlobal.prisma.todo_app_guest_sessions.create({
    data: {
      id: newSessionId,
      todo_app_guest_id: decoded.sub,
      ip: "",
      href: "",
      referrer: "",
      created_at: createdAt,
      expired_at: refreshExpiresAt,
    },
  });
  // 7. Generate new tokens
  const accessToken: string = jwt.sign(
    {
      sub: decoded.sub,
      session_id: newSessionId,
      kind: "guest",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      sub: decoded.sub,
      session_id: newSessionId,
      kind: "guest",
      type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Compute access token expiry string
  const accessExpiresAt: string = new Date(
    nowMs + 60 * 60 * 1000,
  ).toISOString();
  // 9. Build and return response
  return {
    id: guest.id,
    fingerprint: guest.fingerprint,
    created_at: guest.created_at.toISOString(),
    updated_at: guest.updated_at.toISOString(),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
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
// import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postTodoAppAuthGuestRefresh(props: {
//   body: ITodoAppGuest.IRefresh;
// }): Promise<ITodoAppGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------