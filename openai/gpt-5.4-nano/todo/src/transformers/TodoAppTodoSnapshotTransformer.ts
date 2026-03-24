import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoSnapshotTransformer {
  export type Payload = Prisma.todo_app_todo_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  function completionStatusToBoolean(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    if (
      normalized === "true" ||
      normalized === "1" ||
      normalized === "yes" ||
      normalized === "completed"
    ) {
      return true;
    }
    if (
      normalized === "false" ||
      normalized === "0" ||
      normalized === "no" ||
      normalized === "incomplete"
    ) {
      return false;
    }
    return Boolean(normalized);
  }
  export function select() {
    return {
      select: {
        id: true,
        todo_app_todo_id: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        completion_status: true,
        lifecycle_deleted: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.todo_app_todo_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoSnapshot> {
    return {
      id: input.id,
      todoAppTodoId: input.todo_app_todo_id,
      title: input.title,
      description: input.description ?? null,
      startDate: input.start_date ? input.start_date.toISOString() : null,
      dueDate: input.due_date ? input.due_date.toISOString() : null,
      completionStatus: completionStatusToBoolean(input.completion_status),
      lifecycleDeleted: input.lifecycle_deleted,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
