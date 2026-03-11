import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoTodoSnapshotTransformer {
  export type Payload = Prisma.multi_user_todo_todo_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        is_completed: true,
        is_deleted: true,
        created_at: true,
        todo: {
          select: {
            id: true,
          },
        } satisfies Prisma.multi_user_todo_todosFindManyArgs,
      },
    } satisfies Prisma.multi_user_todo_todo_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoTodoSnapshot> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      startDate: input.start_date ? input.start_date.toISOString() : null,
      dueDate: input.due_date ? input.due_date.toISOString() : null,
      isCompleted: input.is_completed,
      isDeleted: input.is_deleted,
      createdAt: input.created_at.toISOString(),
      multiUserTodoTodoId: input.todo.id,
    };
  }
}
