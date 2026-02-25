import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppUserAtSummaryTransformer } from "./TodoAppUserAtSummaryTransformer";

export namespace TodoAppTodoTransformer {
  /**
   * Prisma payload type representing exactly what select() returns
   */
  export type Payload = Prisma.todo_app_todosGetPayload<
    ReturnType<typeof select>
  >;
  /**
   * select() function - defines what database fields to load
   */
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: TodoAppUserAtSummaryTransformer.select(),
        completions: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_todo_completionsFindManyArgs,
        descriptionField: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_todo_description_fieldsFindManyArgs,
        startDateField: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_todo_start_date_fieldsFindManyArgs,
        dueDateField: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_todo_due_date_fieldsFindManyArgs,
        histories: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_todo_historiesFindManyArgs,
        historySnapshotItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_todo_history_snapshot_itemsFindManyArgs,
        trashItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_trash_itemsFindManyArgs,
        permanentDeletions: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_permanent_deletionsFindManyArgs,
      },
    } satisfies Prisma.todo_app_todosFindManyArgs;
  }
  /**
   * transform() function - converts Prisma payload to DTO
   */
  export async function transform(input: Payload): Promise<ITodoAppTodo> {
    return {
      id: input.id,
      title: input.title,
      user: await TodoAppUserAtSummaryTransformer.transform(input.user),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      completion_status: input.completions.length > 0,
    };
  }
}
