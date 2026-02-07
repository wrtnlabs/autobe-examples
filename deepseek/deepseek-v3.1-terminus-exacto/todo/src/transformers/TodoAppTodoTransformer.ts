import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppUserAtSummaryTransformer } from "./TodoAppUserAtSummaryTransformer";

export namespace TodoAppTodoTransformer {
  export type Payload = Prisma.todo_app_todosGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: TodoAppUserAtSummaryTransformer.select(),
        todo_app_todo_description_fields: {
          select: {
            description: true,
          },
        },
        todo_app_todo_start_date_fields: {
          select: {
            start_date: true,
          },
        },
        todo_app_todo_due_date_fields: {
          select: {
            due_date: true,
          },
        },
        todo_app_todo_completions: {
          select: {
            completed: true,
            created_at: true,
          },
          orderBy: {
            created_at: "desc",
          },
          take: 1,
        },
        todo_app_todo_histories: {
          select: {
            id: true,
          },
        },
        todo_app_todo_history_snapshot_items: {
          select: {
            id: true,
          },
        },
        todo_app_trash_items: {
          select: {
            id: true,
          },
        },
        todo_app_permanent_deletions: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.todo_app_todosFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppTodo> {
    // Get latest completion status
    const latestCompletion = input.todo_app_todo_completions[0];
    const completionStatus = latestCompletion?.completed
      ? "complete"
      : "incomplete";
    return {
      id: input.id,
      title: input.title,
      description:
        input.todo_app_todo_description_fields?.description ?? undefined,
      start_date: input.todo_app_todo_start_date_fields?.start_date
        ? toISOStringSafe(input.todo_app_todo_start_date_fields.start_date)
        : undefined,
      due_date: input.todo_app_todo_due_date_fields?.due_date
        ? toISOStringSafe(input.todo_app_todo_due_date_fields.due_date)
        : undefined,
      completion_status: completionStatus,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      user: await TodoAppUserAtSummaryTransformer.transform(input.user),
    };
  }
}
