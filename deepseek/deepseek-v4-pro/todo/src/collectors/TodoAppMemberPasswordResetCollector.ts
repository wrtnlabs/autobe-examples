import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAppMemberPasswordResetCollector {
  export async function collect(props: {
    body: ITodoAppMemberPasswordReset.ICreate;
  }) {
    const member = await MyGlobal.prisma.todo_app_members.findFirstOrThrow({
      where: { email: props.body.email },
    });
    return {
      id: v4(),
      token: v4(),
      expired_at: new Date(Date.now() + 3600000),
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: member.id } },
    } satisfies Prisma.todo_app_member_password_resetsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace TodoAppMemberPasswordResetCollector {
//         export async function collect(props: {
//           body: ITodoAppMemberPasswordReset.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       token: ...,
//       expired_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       member: ...,
//           } satisfies Prisma.todo_app_member_password_resetsCreateInput;
//         }
//       }
//--------------------------------------------------------------