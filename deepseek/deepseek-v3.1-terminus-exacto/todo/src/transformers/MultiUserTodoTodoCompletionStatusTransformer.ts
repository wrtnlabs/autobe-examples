import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoCompletionStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoCompletionStatus";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoTodoCompletionStatusTransformer {
  export type Payload =
    Prisma.multi_user_todo_todo_completion_statusesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        is_completed: true,
        created_at: true,
      },
    } satisfies Prisma.multi_user_todo_todo_completion_statusesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoTodoCompletionStatus> {
    return {
      id: input.id,
      is_completed: input.is_completed,
      created_at: input.created_at.toISOString(),
    };
  }
}
