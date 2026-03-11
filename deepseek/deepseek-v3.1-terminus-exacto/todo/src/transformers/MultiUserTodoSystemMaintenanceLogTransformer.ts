import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { IMultiUserTodoSystemMaintenanceLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemMaintenanceLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoAdminAtSummaryTransformer } from "./MultiUserTodoAdminAtSummaryTransformer";

export namespace MultiUserTodoSystemMaintenanceLogTransformer {
  export type Payload =
    Prisma.multi_user_todo_system_maintenance_logsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        operation_type: true,
        description: true,
        status: true,
        started_at: true,
        completed_at: true,
        created_at: true,
        updated_at: true,
        admin: MultiUserTodoAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_system_maintenance_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoSystemMaintenanceLog> {
    return {
      id: input.id,
      operationType: input.operation_type,
      description: input.description,
      status: input.status,
      startedAt: input.started_at.toISOString(),
      completedAt: input.completed_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      admin: await MultiUserTodoAdminAtSummaryTransformer.transform(
        input.admin,
      ),
    };
  }
}
