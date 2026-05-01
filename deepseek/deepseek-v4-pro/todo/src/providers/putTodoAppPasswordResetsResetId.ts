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

export async function putTodoAppPasswordResetsResetId(props: {
  resetId: string & tags.Format<"uuid">;
  body: ITodoAppMemberPasswordReset.IUpdate;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const reset = await tx.todo_app_member_password_resets.findUniqueOrThrow({
      where: { id: props.resetId },
      select: {
        id: true,
        todo_app_member_id: true,
        expired_at: true,
      },
    });
    if (reset.expired_at.toISOString() < new Date().toISOString()) {
      throw new HttpException("Reset token has expired", 400);
    }
    const member = await tx.todo_app_members.findUniqueOrThrow({
      where: { id: reset.todo_app_member_id },
      select: { id: true, deleted_at: true },
    });
    if (member.deleted_at !== null) {
      throw new HttpException("Member account not found", 404);
    }
    const passwordHash = await PasswordUtil.hash(props.body.password);
    await tx.todo_app_members.update({
      where: { id: reset.todo_app_member_id },
      data: {
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      },
    });
    await tx.todo_app_member_password_resets.delete({
      where: { id: props.resetId },
    });
    await tx.todo_app_member_sessions.deleteMany({
      where: { todo_app_member_id: reset.todo_app_member_id },
    });
  });
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
// export async function putTodoAppPasswordResetsResetId(props: {
//   resetId: string & tags.Format<"uuid">;
//   body: ITodoAppMemberPasswordReset.IUpdate;
// }): Promise<void> {
//   await MyGlobal.prisma.....update({
//     where: { ... },
//     data: { ... },
//   });
// }
// ```
//--------------------------------------------------------------