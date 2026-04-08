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

export async function postTodoAppAuthMemberJoin(props: {
  ip: string;
  body: ITodoAppMember.IJoin;
}): Promise<ITodoAppMember.IAuthorized> {
  const existing = await MyGlobal.prisma.todo_app_members.findFirst({
    where: { email: props.body.email },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const memberId = v4();
  const createdAt = toISOStringSafe(new Date());
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  await MyGlobal.prisma.todo_app_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: new Date(createdAt),
      updated_at: new Date(createdAt),
      deleted_at: null,
    },
  });
  const member = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id: memberId },
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
  const issuedAt = toISOStringSafe(member.created_at);
  const expiredAt = toISOStringSafe(
    new Date(member.created_at.getTime() + 60 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(member.created_at.getTime() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId = v4();
  if (member.profile === null) {
    throw new HttpException("Profile not found", 500);
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
    deleted_at:
      member.deleted_at !== null ? toISOStringSafe(member.deleted_at) : null,
    token: {
      access: jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: sessionId,
          created_at: issuedAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { issuer: "autobe", expiresIn: "1h" },
      ),
      refresh: jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: sessionId,
          tokenType: "refresh",
          created_at: issuedAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { issuer: "autobe", expiresIn: "7d" },
      ),
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
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
// import { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
// import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postTodoAppAuthMemberJoin(props: {
//   ip: string;
//   body: ITodoAppMember.IJoin;
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