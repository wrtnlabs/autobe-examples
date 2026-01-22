import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppUserPasswordResetTransformer {
  export type Payload = Prisma.todo_app_user_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        requested_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        todoAppUser: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.todo_app_user_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppUserPasswordReset> {
    return {
      id: input.id,
      todo_app_user_id: input.todoAppUser.id,
      token: input.token,
      expires_at: input.expires_at?.toISOString() ?? null,
      requested_at: input.requested_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
