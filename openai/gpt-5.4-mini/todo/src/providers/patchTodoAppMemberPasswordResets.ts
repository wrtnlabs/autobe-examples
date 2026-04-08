import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
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

export async function patchTodoAppMemberPasswordResets(props: {
  member: MemberPayload;
  body: ITodoAppMemberPasswordReset.IRequest;
}): Promise<ITodoAppMember> {
  const reset =
    await MyGlobal.prisma.todo_app_member_password_resets.findFirstOrThrow({
      where: {
        token: props.body.token,
        deleted_at: null,
        todo_app_member_id: props.member.id,
      },
      select: {
        id: true,
        todo_app_member_id: true,
      },
    });
  const password_hash = await PasswordUtil.hash(props.body.password);
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.todo_app_members.update({
      where: {
        id: reset.todo_app_member_id,
      },
      data: {
        password_hash,
      },
    });
    await prisma.todo_app_member_password_resets.delete({
      where: {
        id: reset.id,
      },
    });
  });
  const member = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: {
      id: reset.todo_app_member_id,
    },
    ...TodoAppMemberTransformer.select(),
  });
  return await TodoAppMemberTransformer.transform(member);
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
// import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
// import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
// import { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
// import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchTodoAppMemberPasswordResets(props: {
//   member: MemberPayload;
//   body: ITodoAppMemberPasswordReset.IRequest;
// }): Promise<ITodoAppMember> {
//   const record = await MyGlobal.prisma.todo_app_members.findFirstOrThrow({
//     ...TodoAppMemberTransformer.select(),
//     where: { ... },
//   });
//   return await TodoAppMemberTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------