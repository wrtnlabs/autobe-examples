import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoBackupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoBackupLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoBackupLogAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_backup_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        backup_type: true,
        status: true,
        started_at: true,
        completed_at: true,
        backup_file_size: true,
        recovery_point_id: true,
        recovery_point_timestamp: true,
        operation_duration: true,
      },
    } satisfies Prisma.multi_user_todo_backup_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoBackupLog.ISummary> {
    return {
      id: input.id,
      backup_type: input.backup_type,
      status: input.status,
      started_at: input.started_at.toISOString(),
      completed_at: input.completed_at?.toISOString() ?? undefined,
      recovery_point_id: input.recovery_point_id ?? null,
      recovery_point_timestamp:
        input.recovery_point_timestamp?.toISOString() ?? undefined,
      operation_duration: input.operation_duration
        ? Number(input.operation_duration)
        : null,
      backup_file_size: input.backup_file_size
        ? Number(input.backup_file_size)
        : null,
    };
  }
}
