import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { IMultiUserTodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoUserAtSummaryTransformer } from "./MultiUserTodoUserAtSummaryTransformer";

export namespace MultiUserTodoUserPasswordResetTransformer {
  export type Payload = Prisma.multi_user_todo_user_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expired_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        multi_user_todo_user_id: true,
        user: MultiUserTodoUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_user_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoUserPasswordReset> {
    return {
      id: input.id,
      token: input.token,
      expiredAt: input.expired_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      multiUserTodoUserId: input.multi_user_todo_user_id,
      user: await MultiUserTodoUserAtSummaryTransformer.transform(input.user),
    };
  }
}
