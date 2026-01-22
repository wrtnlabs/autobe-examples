import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoItemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItemAuditLog";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoAppUserAtSummaryTransformer } from "./TodoAppUserAtSummaryTransformer";

export namespace TodoAppTodoItemAuditLogAtSummaryTransformer {
  export type Payload = Prisma.todo_app_todo_item_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        todoItem: {
          select: {
            id: true,
          },
        },
        user: TodoAppUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_todo_item_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoItemAuditLog.ISummary> {
    return {
      id: input.id,
      todo_app_todo_item_id: input.todoItem.id,
      user: await TodoAppUserAtSummaryTransformer.transform(input.user),
      action: input.action,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
