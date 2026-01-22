import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppTodoItemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItemAuditLog";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoAppUserAtSummaryTransformer } from "./TodoAppUserAtSummaryTransformer";
import { TodoAppTodoItemAuditLogAtSummaryTransformer } from "./TodoAppTodoItemAuditLogAtSummaryTransformer";

export namespace TodoAppTodoItemAtSummaryTransformer {
  export type Payload = Prisma.todo_app_todo_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: TodoAppUserAtSummaryTransformer.select(),
        todo_app_todo_item_audit_logs:
          TodoAppTodoItemAuditLogAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_todo_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoItem.ISummary> {
    return {
      id: input.id,
      title: input.title,
      description: input.description,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      user: await TodoAppUserAtSummaryTransformer.transform(input.user),
      auditLogs: await ArrayUtil.asyncMap(
        input.todo_app_todo_item_audit_logs,
        TodoAppTodoItemAuditLogAtSummaryTransformer.transform,
      ),
    };
  }
}
