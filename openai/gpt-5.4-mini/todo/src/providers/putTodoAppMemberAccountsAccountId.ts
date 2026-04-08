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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberTransformer } from "../transformers/TodoAppMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppMemberAccountsAccountId(props: {
  member: MemberPayload;
  accountId: string & tags.Format<"uuid">;
  body: ITodoAppMember.IUpdate;
}): Promise<ITodoAppMember> {
  const target = await MyGlobal.prisma.todo_app_members.findUnique({
    where: { id: props.accountId },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (target === null || target.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (target.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.email !== undefined) {
    const duplicated = await MyGlobal.prisma.todo_app_members.findFirst({
      where: {
        email: props.body.email,
        NOT: { id: props.accountId },
      },
      select: { id: true },
    });
    if (duplicated !== null) {
      throw new HttpException("Conflict", 409);
    }
  }
  await MyGlobal.prisma.todo_app_members.update({
    where: { id: props.accountId },
    data: {
      ...(props.body.email !== undefined ? { email: props.body.email } : {}),
      ...(props.body.password !== undefined
        ? { password_hash: await PasswordUtil.hash(props.body.password) }
        : {}),
      updated_at: new Date().toISOString(),
    },
  });
  const updated = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id: props.accountId },
    ...TodoAppMemberTransformer.select(),
  });
  return await TodoAppMemberTransformer.transform(updated);
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putTodoAppMemberAccountsAccountId(props: {
//   member: MemberPayload;
//   accountId: string & tags.Format<"uuid">;
//   body: ITodoAppMember.IUpdate;
// }): Promise<ITodoAppMember> {
//   await MyGlobal.prisma.todo_app_members.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
//     where: { ... },
//     ...TodoAppMemberTransformer.select(),
//   });
//   return await TodoAppMemberTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------