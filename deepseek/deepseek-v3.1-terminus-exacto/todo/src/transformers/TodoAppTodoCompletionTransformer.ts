import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoCompletion";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoCompletionTransformer {
  export type Payload = Prisma.todo_app_todo_completionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        completed: true,
        created_at: true,
      },
    } satisfies Prisma.todo_app_todo_completionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoCompletion> {
    return {
      id: input.id,
      completed: input.completed,
      created_at: input.created_at.toISOString(),
    };
  }
}
