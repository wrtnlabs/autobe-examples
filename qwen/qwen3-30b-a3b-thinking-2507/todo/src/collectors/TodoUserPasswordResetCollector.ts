import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoUserPasswordResetCollector {
  export async function collect(props: {
    body: ITodoUserPasswordReset.ICreate;
    todoUsers: IEntity;
  }) {
    const id = v4();
    const token =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const expires_at = new Date(Date.now() + 3600000);
    return {
      id,
      token,
      expires_at,
      used_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      user: { connect: { id: props.todoUsers.id } },
    } satisfies Prisma.todo_user_password_resetsCreateInput;
  }
}
