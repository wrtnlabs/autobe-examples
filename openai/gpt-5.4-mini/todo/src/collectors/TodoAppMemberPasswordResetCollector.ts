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
    todoAppMembers: IEntity;
  }) {
    const id: string = v4();
    const createdAt: Date = new Date();
    const expiredAt: Date = new Date(createdAt.getTime() + 1000 * 60 * 30);
    return {
      id,
      token: props.body.token,
      created_at: createdAt,
      expired_at: expiredAt,
      used_at: null,
      member: { connect: { id: props.todoAppMembers.id } },
    } satisfies Prisma.todo_app_member_password_resetsCreateInput;
  }
}
