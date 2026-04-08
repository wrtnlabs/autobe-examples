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

export async function getTodoAppMemberAccountsAccountId(props: {
  member: MemberPayload;
  accountId: string & tags.Format<"uuid">;
}): Promise<ITodoAppMember> {
  const record = await MyGlobal.prisma.todo_app_members.findFirstOrThrow({
    ...TodoAppMemberTransformer.select(),
    where: {
      id: props.accountId,
      deleted_at: null,
    },
  });
  if (record.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await TodoAppMemberTransformer.transform(record);
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
// export async function getTodoAppMemberAccountsAccountId(props: {
//   member: MemberPayload;
//   accountId: string & tags.Format<"uuid">;
// }): Promise<ITodoAppMember> {
//   const record = await MyGlobal.prisma.todo_app_members.findFirstOrThrow({
//     ...TodoAppMemberTransformer.select(),
//     where: { ... },
//   });
//   return await TodoAppMemberTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------