import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoItemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItemAuditLog";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoItemAuditLogTransformer {
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
        user: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.todo_app_todo_item_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoItemAuditLog> {
    return {
      id: input.id,
      user: {
        // Inline transformation for ITodoAppUser.ISummary
        id: input.user.id,
      },
      todoItem: {
        // Inline transformation for ITodoAppTodoItem.ISummary
        id: input.todoItem.id,
      },
      action: input.action,
      created_at: input.created_at?.toISOString() ?? null,
      updated_at: input.updated_at?.toISOString() ?? null,
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
