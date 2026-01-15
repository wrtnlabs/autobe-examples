import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoTaskTransformer {
  export type Payload = Prisma.todo_tasksGetPayload<ReturnType<typeof select>>;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        completed: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.todo_tasksFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoTask> {
    return {
      id: input.id,
      title: input.title,
      description: undefined,
      completed: input.completed,
      created_at: input.created_at.toISOString(),
    };
  }
}
