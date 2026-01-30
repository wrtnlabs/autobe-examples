import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAppUserEmailVerificationCollector {
  function toISOStringSafe(date: Date): string {
    return date.toISOString();
  }
  export async function collect(props: {
    body: ITodoAppUserEmailVerification.ICreate & {
      user: unknown;
    };
  }) {
    return {
      id: v4(),
      token: props.body.token,
      token_expired_at: props.body.token_expired_at
        ? toISOStringSafe(new Date(props.body.token_expired_at))
        : toISOStringSafe(new Date()),
      verified_at: props.body.verified_at
        ? toISOStringSafe(new Date(props.body.verified_at))
        : null,
      created_at: props.body.created_at
        ? toISOStringSafe(new Date(props.body.created_at))
        : toISOStringSafe(new Date()),
      deleted_at: props.body.deleted_at
        ? toISOStringSafe(new Date(props.body.deleted_at))
        : null,
      user: props.body.user as any,
    } satisfies Prisma.todo_app_user_email_verificationsCreateInput;
  }
}
