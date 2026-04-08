import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppProfileTransformer } from "../transformers/TodoAppProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberProfile(props: {
  member: MemberPayload;
  body: ITodoAppProfile.IUpdate;
}): Promise<ITodoAppProfile> {
  const current = await MyGlobal.prisma.todo_app_profiles.findFirstOrThrow({
    where: {
      todo_app_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      display_name: true,
    },
  });
  if (props.body.displayName.trim().length === 0) {
    throw new HttpException("Display name is required", 400);
  }
  if (current.display_name === props.body.displayName) {
    throw new HttpException("Display name must be changed", 400);
  }
  await MyGlobal.prisma.todo_app_profiles.update({
    where: {
      id: current.id,
    },
    data: {
      display_name: props.body.displayName,
      updated_at: new Date(),
    },
  });
  const record = await MyGlobal.prisma.todo_app_profiles.findFirstOrThrow({
    where: {
      id: current.id,
    },
    ...TodoAppProfileTransformer.select(),
  });
  return await TodoAppProfileTransformer.transform(record);
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
// import { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
// import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchTodoAppMemberProfile(props: {
//   member: MemberPayload;
//   body: ITodoAppProfile.IUpdate;
// }): Promise<ITodoAppProfile> {
//   const record = await MyGlobal.prisma.todo_app_profiles.findFirstOrThrow({
//     ...TodoAppProfileTransformer.select(),
//     where: { ... },
//   });
//   return await TodoAppProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------