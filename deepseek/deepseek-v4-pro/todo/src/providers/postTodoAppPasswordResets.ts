import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppPasswordResets(props: {
  body: ITodoAppMemberPasswordReset.ICreate;
}): Promise<void> {
  const member = await MyGlobal.prisma.todo_app_members.findFirst({
    where: { email: props.body.email },
    select: { id: true },
  });
  if (member !== null) {
    const now: number = Date.now();
    const created_at: string = new Date(now).toISOString();
    const expired_at: string = new Date(now + 3600000).toISOString();
    await MyGlobal.prisma.todo_app_member_password_resets.create({
      data: {
        id: v4(),
        token: v4(),
        expired_at,
        created_at,
        updated_at: created_at,
        member: { connect: { id: member.id } },
      },
    });
  }
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postTodoAppPasswordResets(props: {
//   body: ITodoAppMemberPasswordReset.ICreate;
// }): Promise<void> {
//   await MyGlobal.prisma.todo_app_member_password_resets.create({
//     data: await TodoAppMemberPasswordResetCollector.collect({
//       body: props.body,
//       ...
//     }),
//   });
// }
// ```
//--------------------------------------------------------------