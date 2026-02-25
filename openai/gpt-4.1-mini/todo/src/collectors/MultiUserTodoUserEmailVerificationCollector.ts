import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MultiUserTodoUserEmailVerificationCollector {
  export async function collect(props: {
    body: IMultiUserTodoUserEmailVerification.ICreate;
  }) {
    const id: string = v4();
    // Default expiration is 24 hours from now
    const expiresAt: Date = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return {
      id,
      token: props.body.token,
      expires_at: expiresAt,
      verified_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: { connect: { id: props.body.multiUserTodoUserId } },
    } satisfies Prisma.multi_user_todo_user_email_verificationsCreateInput;
  }
}
