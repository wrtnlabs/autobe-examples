import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppUserPasswordResetTransformer {
  export type Payload = Prisma.todo_app_user_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        todo_app_user_id: true,
        token: true,
        expired_at: true,
      },
    } satisfies Prisma.todo_app_user_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppUserPasswordReset> {
    return {
      id: input.id,
      todo_app_user_id: input.todo_app_user_id,
      token: input.token,
      expired_at: input.expired_at.toISOString(),
    };
  }
}
