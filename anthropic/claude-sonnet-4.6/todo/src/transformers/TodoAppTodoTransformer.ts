import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoTransformer {
  export type Payload = Prisma.todo_app_todosGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        todo_app_member_id: true,
        title: true,
        description: true,
        is_completed: true,
        started_at: true,
        due_at: true,
        trashed_at: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.todo_app_todosFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppTodo> {
    return {
      id: input.id,
      todo_app_member_id: input.todo_app_member_id,
      title: input.title,
      description: input.description,
      is_completed: input.is_completed,
      started_at: input.started_at?.toISOString() ?? null,
      due_at: input.due_at?.toISOString() ?? null,
      trashed_at: input.trashed_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
