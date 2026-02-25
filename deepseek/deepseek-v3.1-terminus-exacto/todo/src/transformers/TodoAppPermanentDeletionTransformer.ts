import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppPermanentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppPermanentDeletion";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppTodoAtSummaryTransformer } from "./TodoAppTodoAtSummaryTransformer";
import { TodoAppUserAtSummaryTransformer } from "./TodoAppUserAtSummaryTransformer";

export namespace TodoAppPermanentDeletionTransformer {
  export type Payload = Prisma.todo_app_permanent_deletionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        deleted_at: true,
        reason: true,
        created_at: true,
        updated_at: true,
        user: TodoAppUserAtSummaryTransformer.select(),
        todo: TodoAppTodoAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_permanent_deletionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppPermanentDeletion> {
    return {
      id: input.id,
      user: await TodoAppUserAtSummaryTransformer.transform(input.user),
      todo: await TodoAppTodoAtSummaryTransformer.transform(input.todo),
      deleted_at: input.deleted_at.toISOString(),
      reason: input.reason ?? null,
    };
  }
}
