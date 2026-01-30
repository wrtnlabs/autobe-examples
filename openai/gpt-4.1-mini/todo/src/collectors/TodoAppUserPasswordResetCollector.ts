import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAppUserPasswordResetCollector {
  export async function collect(props: {
    body: ITodoAppUserPasswordReset.ICreate;
    todoAppUser: IEntity;
  }) {
    return {
      id: v4(),
      token: props.body.token,
      expires_at: props.body.expires_at
        ? new Date(props.body.expires_at)
        : new Date(),
      requested_at: props.body.requested_at
        ? new Date(props.body.requested_at)
        : new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      todoAppUser: {
        connect: { id: props.todoAppUser.id },
      },
    } satisfies Prisma.todo_app_user_password_resetsCreateInput;
  }
}
