import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoEditHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistorySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoEditHistorySnapshotAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_edit_history_snapshotsGetPayload<
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
        created_at: true,
        updated_at: true,
        todo: {
          select: {
            id: true,
          },
        } satisfies Prisma.multi_user_todo_todosFindManyArgs,
      },
    } satisfies Prisma.multi_user_todo_edit_history_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoEditHistorySnapshot.ISummary> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      startDate: input.start_date ? input.start_date.toISOString() : null,
      dueDate: input.due_date ? input.due_date.toISOString() : null,
      isCompleted: input.is_completed,
      createdAt: input.created_at.toISOString(),
    };
  }
}
