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

export async function putTodoAppProfile(props: {
  body: ITodoAppMember.IUpdate;
}): Promise<ITodoAppMember> {
  // Authenticated member ID injected by middleware
  const memberId: string = "context_user_id";
  const member = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id: memberId },
    select: { deleted_at: true },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.todo_app_members.update({
    where: { id: memberId },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      updated_at: new Date(),
    },
  });
  const result = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id: memberId },
    ...TodoAppMemberTransformer.select(),
  });
  return await TodoAppMemberTransformer.transform(result);
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
// export async function putTodoAppProfile(props: {
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