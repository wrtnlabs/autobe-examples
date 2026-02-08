import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MultiUserTodoUserPasswordResetCollector {
  export async function collect(props: {
    body: IMultiUserTodoUserPasswordReset.ICreate;
    user: IEntity;
  }) {
    const id: string = v4();
    const token = "dummy-token";
    const now = new Date();
    const expiredAtDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour expiration
    return {
      id,
      token,
      expired_at: expiredAtDate,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      user: { connect: { id: props.user.id } },
    } satisfies Prisma.multi_user_todo_user_password_resetsCreateInput;
  }
}
