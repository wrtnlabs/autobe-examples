import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBackupRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardBackupRecordTransformer } from "../transformers/DiscussionBoardBackupRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminBackupRecordsBackupRecordId(props: {
  superAdmin: SuperAdminPayload;
  backupRecordId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBackupRecord.IUpdate;
}): Promise<IDiscussionBoardBackupRecord> {
  // Ensure the backup record exists
  const existingRecord =
    await MyGlobal.prisma.discussion_board_backup_records.findUniqueOrThrow({
      where: { id: props.backupRecordId },
    });
  // Status transition validation
  if (props.body.status !== undefined) {
    const validTransitions: Record<string, string[]> = {
      in_progress: ["completed", "failed", "cancelled"],
      completed: [], // Can't change after completion
      failed: [], // Can't change after failure
      cancelled: [], // Can't change after cancellation
    };
    const currentStatus = existingRecord.status;
    // Type narrow currentStatus to be a valid key
    if (currentStatus in validTransitions) {
      const validStatus = currentStatus as keyof typeof validTransitions;
      if (!validTransitions[validStatus].includes(props.body.status)) {
        throw new HttpException(
          `Invalid status transition from '${currentStatus}' to '${props.body.status}'`,
          400,
        );
      }
    }
  }
  // Validation: file size must be positive if provided
  if (props.body.size_bytes !== undefined && props.body.size_bytes < 0) {
    throw new HttpException("size_bytes must be a positive integer", 400);
  }
  // Validation: completed_at must be after started_at if provided
  if (props.body.completed_at !== undefined) {
    const completedAt = new Date(props.body.completed_at);
    const startedAt = new Date(existingRecord.started_at);
    if (completedAt <= startedAt) {
      throw new HttpException("completed_at must be after started_at", 400);
    }
  }
  // Build update data
  const updateData: Prisma.discussion_board_backup_recordsUpdateInput = {
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.file_path !== undefined && {
      file_path: props.body.file_path,
    }),
    ...(props.body.size_bytes !== undefined && {
      size_bytes: props.body.size_bytes,
    }),
    ...(props.body.completed_at !== undefined && {
      completed_at: new Date(props.body.completed_at),
    }),
    ...(props.body.error_message !== undefined && {
      error_message: props.body.error_message,
    }),
    updated_at: new Date(),
  };
  // Execute the update
  await MyGlobal.prisma.discussion_board_backup_records.update({
    where: { id: props.backupRecordId },
    data: updateData,
  });
  // Fetch the updated record with transformer selection
  const updatedRecord =
    await MyGlobal.prisma.discussion_board_backup_records.findUniqueOrThrow({
      where: { id: props.backupRecordId },
      ...DiscussionBoardBackupRecordTransformer.select(),
    });
  // Transform and return
  return await DiscussionBoardBackupRecordTransformer.transform(updatedRecord);
}
