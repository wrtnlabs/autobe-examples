import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoUserEmailVerificationCollector {
  export async function collect(props: {
    body: ITodoUserEmailVerification.ICreate;
    todoUsers: IEntity;
  }) {
    return {
      id: v4(),
      token: Math.random().toString(36).substr(2, 16),
      expires_at: new Date(Date.now() + 15 * 60 * 1000),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: { connect: { id: props.todoUsers.id } },
    } satisfies Prisma.todo_user_email_verificationsCreateInput;
  }
}
