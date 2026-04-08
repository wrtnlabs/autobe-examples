import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppProfileTransformer } from "../transformers/TodoAppProfileTransformer";
import { TodoAppTodoAtSummaryTransformer } from "../transformers/TodoAppTodoAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthMemberRefresh(props: {
  body: ITodoAppMember.IRefresh;
}): Promise<ITodoAppMember.IAuthorized> {
  const decodedUnknown: unknown = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  if (typeof decodedUnknown !== "object" || decodedUnknown === null) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  type DecodedRefreshToken = {
    type: unknown;
    id: unknown;
    session_id: unknown;
  };
  const decoded = decodedUnknown as DecodedRefreshToken;
  if (
    decoded.type !== "member" ||
    typeof decoded.id !== "string" ||
    typeof decoded.session_id !== "string"
  ) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const session = await MyGlobal.prisma.todo_app_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_member_id: decoded.id,
    },
    select: {
      id: true,
      todo_app_member_id: true,
      expired_at: true,
    },
  });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const member = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id: decoded.id },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      profile: TodoAppProfileTransformer.select(),
      todos: TodoAppTodoAtSummaryTransformer.select(),
    },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const nowIso = toISOStringSafe(new Date());
  const accessExpiredAtIso = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntilIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const accessToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.todo_app_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  if (member.profile === null) {
    throw new HttpException("Profile not found", 404);
  }
  return {
    id: member.id,
    email: member.email,
    profile: await TodoAppProfileTransformer.transform(member.profile),
    todos: await ArrayUtil.asyncMap(member.todos, (todo) =>
      TodoAppTodoAtSummaryTransformer.transform(todo),
    ),
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAtIso,
      refreshable_until: refreshableUntilIso,
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
// import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
// import { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
// import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postTodoAppAuthMemberRefresh(props: {
//   body: ITodoAppMember.IRefresh;
// }): Promise<ITodoAppMember.IAuthorized> {
//   return {
//     id: ...,
//     email: ...,
//     profile: await TodoAppProfileTransformer.transform(...),
//     todos: await ArrayUtil.asyncMap(..., (r) => TodoAppTodoAtSummaryTransformer.transform(r)),
//     created_at: ...,
//     updated_at: ...,
//     deleted_at: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------