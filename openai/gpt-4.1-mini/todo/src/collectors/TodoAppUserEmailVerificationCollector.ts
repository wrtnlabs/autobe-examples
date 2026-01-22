import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAppUserEmailVerificationCollector {
  export async function collect(props: {
    body: ITodoAppUserEmailVerification.ICreate;
    user: IEntity;
  }) {
    return {
      id: v4(),
      token: props.body.token,
      token_expired_at: new Date(props.body.token_expired_at),
      verified_at: props.body.verified_at
        ? new Date(props.body.verified_at)
        : null,
      created_at: new Date(),
      deleted_at: null,
      user: {
        connect: {
          id: props.user.id,
        },
      },
    } satisfies Prisma.todo_app_user_email_verificationsCreateInput;
  }
}
