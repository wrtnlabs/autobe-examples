import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoAppUserAtSummaryTransformer } from "./TodoAppUserAtSummaryTransformer";

export namespace TodoAppUserPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.todo_app_user_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        requested_at: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        todoAppUser: TodoAppUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_user_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppUserPasswordReset.ISummary> {
    return {
      id: input.id,
      token: input.token,
      requested_at: input.requested_at
        ? input.requested_at.toISOString()
        : null,
      expires_at: input.expires_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at ? input.updated_at.toISOString() : null,
      todoAppUser: await TodoAppUserAtSummaryTransformer.transform(
        input.todoAppUser,
      ),
    };
  }
}
