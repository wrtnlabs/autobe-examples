import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoBackupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoBackupLog";
import { IMultiUserTodoDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoDataRetentionPolicy";
import { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoDataRetentionPolicyAtSummaryTransformer } from "./MultiUserTodoDataRetentionPolicyAtSummaryTransformer";
import { MultiUserTodoSystemConfigurationAtSummaryTransformer } from "./MultiUserTodoSystemConfigurationAtSummaryTransformer";

export namespace MultiUserTodoBackupLogTransformer {
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
        backup_file_path: true,
        backup_file_size: true,
        recovery_point_id: true,
        recovery_point_timestamp: true,
        error_message: true,
        operation_duration: true,
        created_at: true,
        updated_at: true,
        dataRetentionPolicy:
          MultiUserTodoDataRetentionPolicyAtSummaryTransformer.select(),
        systemConfiguration:
          MultiUserTodoSystemConfigurationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_backup_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoBackupLog> {
    return {
      id: input.id,
      backupType: input.backup_type,
      status: input.status,
      startedAt: input.started_at.toISOString(),
      completedAt: input.completed_at?.toISOString() ?? null,
      backupFilePath: input.backup_file_path ?? null,
      backupFileSize:
        input.backup_file_size !== null ? Number(input.backup_file_size) : null,
      recoveryPointId: input.recovery_point_id ?? null,
      recoveryPointTimestamp:
        input.recovery_point_timestamp?.toISOString() ?? null,
      errorMessage: input.error_message ?? null,
      operationDuration:
        input.operation_duration !== null
          ? Number(input.operation_duration)
          : null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      dataRetentionPolicy: input.dataRetentionPolicy
        ? await MultiUserTodoDataRetentionPolicyAtSummaryTransformer.transform(
            input.dataRetentionPolicy,
          )
        : null,
      systemConfiguration: input.systemConfiguration
        ? await MultiUserTodoSystemConfigurationAtSummaryTransformer.transform(
            input.systemConfiguration,
          )
        : null,
    };
  }
}
