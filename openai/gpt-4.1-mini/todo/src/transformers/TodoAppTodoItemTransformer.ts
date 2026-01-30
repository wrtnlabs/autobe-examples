import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppTodoItemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItemAuditLog";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoAppUserTransformer } from "./TodoAppUserTransformer";
import { TodoAppTodoItemAuditLogTransformer } from "./TodoAppTodoItemAuditLogTransformer";

export namespace TodoAppTodoItemTransformer {
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
        user: TodoAppUserTransformer.select(),
        todo_app_todo_item_audit_logs:
          TodoAppTodoItemAuditLogTransformer.select(),
      },
    } satisfies Prisma.todo_app_todo_itemsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppTodoItem> {
    return {
      id: input.id,
      todoAppUserId: input.user.id,
      title: input.title,
      description: input.description ?? undefined,
      status: Boolean(input.status),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at?.toISOString() ?? undefined,
      deletedAt: input.deleted_at?.toISOString() ?? undefined,
      user: await TodoAppUserTransformer.transform(input.user),
      auditLogs: await ArrayUtil.asyncMap(
        input.todo_app_todo_item_audit_logs,
        TodoAppTodoItemAuditLogTransformer.transform,
      ),
    };
  }
}
