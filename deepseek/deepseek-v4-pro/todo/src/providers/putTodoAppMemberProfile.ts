import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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

export async function putTodoAppMemberProfile(props: {
  member: MemberPayload;
  body: ITodoAppMember.IUpdate;
}): Promise<ITodoAppMember> {
  if (!props.body.display_name || props.body.display_name.trim().length === 0) {
    throw new HttpException("Display name must not be empty", 400);
  }
  await MyGlobal.prisma.todo_app_members.update({
    where: { id: props.member.id },
    data: {
      display_name: props.body.display_name.trim(),
      updated_at: new Date().toISOString(),
    },
  });
  const updated = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id: props.member.id },
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putTodoAppMemberProfile(props: {
//   member: MemberPayload;
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