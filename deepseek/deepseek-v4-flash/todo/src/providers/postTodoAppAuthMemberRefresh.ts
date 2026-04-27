import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppMemberTransformer } from "../transformers/TodoAppMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthMemberRefresh(props: {
  body: ITodoAppMember.IRefresh;
}): Promise<ITodoAppMember.IAuthorized> {
  // 1. Verify refresh token
  let payload: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (typeof decoded === "string") {
      throw new Error();
    }
    payload = decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (payload.type !== "member") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Extract values with type guards (no `as`)
  const memberId: unknown = payload.id;
  if (typeof memberId !== "string") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const sessionId: unknown = payload.session_id;
  if (typeof sessionId !== "string") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 4. Validate member exists
  const member = await MyGlobal.prisma.todo_app_members.findUnique({
    where: { id: memberId },
  });
  if (member === null) {
    throw new HttpException("Member not found", 401);
  }
  // 5. Validate session exists and belongs to member
  const session = await MyGlobal.prisma.todo_app_member_sessions.findFirst({
    where: {
      id: sessionId,
      todo_app_member_id: memberId,
    },
  });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 6. Generate timestamps — Date.now() returns number, not Date type
  const nowMs: number = Date.now();
  const accessMs: number = nowMs + 60 * 60 * 1000;
  const refreshMs: number = nowMs + 7 * 24 * 60 * 60 * 1000;
  // 7. Generate JWT tokens with SAME session_id (session continuity)
  const accessToken: string = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      created_at: new Date(nowMs).toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: new Date(nowMs).toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Build ISO strings for return type (string & Format<"date-time"> not Date)
  const expiredAt: string = new Date(accessMs).toISOString();
  const refreshableUntil: string = new Date(refreshMs).toISOString();
  // 9. Update session expiration to extend lifetime — expired_at is non-nullable DateTime
  await MyGlobal.prisma.todo_app_member_sessions.update({
    where: { id: sessionId },
    data: { expired_at: refreshableUntil },
  });
  // 10. Fetch full member profile using Transformer
  const memberWithProfile =
    await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
      where: { id: memberId },
      ...TodoAppMemberTransformer.select(),
    });
  const memberData =
    await TodoAppMemberTransformer.transform(memberWithProfile);
  // 11. Return complete authorized response
  return {
    id: memberData.id,
    email: memberData.email,
    display_name: memberData.display_name,
    created_at: memberData.created_at,
    updated_at: memberData.updated_at,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    } satisfies IAuthorizationToken,
  } satisfies ITodoAppMember.IAuthorized;
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
// import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postTodoAppAuthMemberRefresh(props: {
//   body: ITodoAppMember.IRefresh;
// }): Promise<ITodoAppMember.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------