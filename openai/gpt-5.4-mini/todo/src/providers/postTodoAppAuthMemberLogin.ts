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

export async function postTodoAppAuthMemberLogin(props: {
  ip: string;
  body: ITodoAppMember.ILogin;
}): Promise<ITodoAppMember.IAuthorized> {
  const member = await MyGlobal.prisma.todo_app_members.findFirst({
    where: {
      email: props.body.email,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (member === null) {
    throw new HttpException("Invalid credentials", 401);
  }
  const verified = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (verified === false) {
    throw new HttpException("Invalid credentials", 401);
  }
  const sessionId = v4();
  const issuedAt = toISOStringSafe(new Date());
  const expiredAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const profile = await MyGlobal.prisma.todo_app_profiles.findUniqueOrThrow({
    where: {
      todo_app_member_id: member.id,
    },
    ...TodoAppProfileTransformer.select(),
  });
  const todos = await MyGlobal.prisma.todo_app_todos.findMany({
    where: {
      todo_app_member_id: member.id,
      deleted_at: null,
    },
    orderBy: {
      created_at: "desc",
    },
    ...TodoAppTodoAtSummaryTransformer.select(),
  });
  return {
    id: member.id,
    email: member.email,
    profile: await TodoAppProfileTransformer.transform(profile),
    todos: await ArrayUtil.asyncMap(todos, (record) =>
      TodoAppTodoAtSummaryTransformer.transform(record),
    ),
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    deleted_at: member.deleted_at?.toISOString() ?? null,
    token: {
      access: jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: sessionId,
          created_at: issuedAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          issuer: "autobe",
          expiresIn: "1h",
        },
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
        {
          issuer: "autobe",
          expiresIn: "7d",
        },
      ),
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
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
// export async function postTodoAppAuthMemberLogin(props: {
//   ip: string;
//   body: ITodoAppMember.ILogin;
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