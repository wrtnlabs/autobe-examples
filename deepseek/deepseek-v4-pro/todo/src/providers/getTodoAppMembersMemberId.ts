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

export async function getTodoAppMembersMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<ITodoAppMember> {
  const record = await MyGlobal.prisma.todo_app_members.findFirstOrThrow({
    where: {
      id: props.memberId,
      deleted_at: null,
    },
    ...TodoAppMemberTransformer.select(),
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getTodoAppMembersMemberId(props: {
//   memberId: string & tags.Format<"uuid">;
// }): Promise<ITodoAppMember> {
//   const record = await MyGlobal.prisma.todo_app_members.findFirstOrThrow({
//     ...TodoAppMemberTransformer.select(),
//     where: { ... },
//   });
//   return await TodoAppMemberTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------