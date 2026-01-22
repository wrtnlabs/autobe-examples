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
  }) {
    return {
      id: v4(),
      token: v4(),
      expires_at: new Date(Date.now() + 3600000),
      requested_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      todoAppUser: {
        connect: { id: props.body.todo_app_user_id },
      },
    } satisfies Prisma.todo_app_user_password_resetsCreateInput;
  }
}
