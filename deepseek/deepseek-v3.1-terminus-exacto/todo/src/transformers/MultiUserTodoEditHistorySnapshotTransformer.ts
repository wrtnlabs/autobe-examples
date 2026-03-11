import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoEditHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistorySnapshot";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoTodoAtSummaryTransformer } from "./MultiUserTodoTodoAtSummaryTransformer";

export namespace MultiUserTodoEditHistorySnapshotTransformer {
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
        todo: MultiUserTodoTodoAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_edit_history_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoEditHistorySnapshot> {
    return {
      id: input.id,
      title: input.title,
      description: input.description ?? undefined,
      startDate: input.start_date?.toISOString() ?? undefined,
      dueDate: input.due_date?.toISOString() ?? undefined,
      isCompleted: input.is_completed,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      todo: await MultiUserTodoTodoAtSummaryTransformer.transform(input.todo),
    };
  }
}
