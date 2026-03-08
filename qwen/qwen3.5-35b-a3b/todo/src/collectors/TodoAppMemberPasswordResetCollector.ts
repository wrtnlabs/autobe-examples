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
    const id: string = v4();
    const token: string = v4();
    const now: Date = new Date();
    // Look up member by email for the relation
    const member = await MyGlobal.prisma.todo_app_members.findFirstOrThrow({
      where: {
        email: props.body.email,
      },
    });
    return {
      id: id,
      token: token,
      expires_at: new Date(now.getTime() + 3600000),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: { connect: { id: member.id } },
    } satisfies Prisma.todo_app_member_password_resetsCreateInput;
  }
}
