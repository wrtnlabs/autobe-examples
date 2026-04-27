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
import { TodoAppGuestTransformer } from "../transformers/TodoAppGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthGuestRefresh(props: {
  body: ITodoAppGuest.IRefresh;
}): Promise<ITodoAppGuest.IAuthorized> {
  // 1. Look up session by refresh token (session id)
  const session = await MyGlobal.prisma.todo_app_guest_sessions.findUnique({
    where: { id: props.body.refresh_token },
    select: {
      id: true,
      todo_app_guest_id: true,
      expired_at: true,
    },
  });
  // 2. Verify session exists and has not expired
  if (!session || session.expired_at <= new Date()) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 3. Verify guest record still exists (may have been deleted on member transition)
  const guest = await MyGlobal.prisma.todo_app_guests.findUnique({
    where: { id: session.todo_app_guest_id },
    ...TodoAppGuestTransformer.select(),
  });
  if (!guest) {
    throw new HttpException("Guest account no longer exists", 401);
  }
  // 4. Generate new tokens preserving session_id
  const now = new Date();
  const accessExpiredAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpiredAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessToken: string = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Extend session expiration
  await MyGlobal.prisma.todo_app_guest_sessions.update({
    where: { id: session.id },
    data: { expired_at: refreshExpiredAt },
  });
  // 6. Build response — reuse transformer for guest fields
  const guestDto = await TodoAppGuestTransformer.transform(guest);
  return {
    id: guestDto.id,
    created_at: guestDto.created_at,
    updated_at: guestDto.updated_at,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt.toISOString(),
      refreshable_until: refreshExpiredAt.toISOString(),
    } satisfies IAuthorizationToken,
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