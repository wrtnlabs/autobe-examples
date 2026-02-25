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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBackupRecordTransformer } from "../transformers/DiscussionBoardBackupRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminBackupRecordsBackupRecordId(props: {
  admin: AdminPayload;
  backupRecordId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBackupRecord.IUpdate;
}): Promise<IDiscussionBoardBackupRecord> {
  // First, ensure the backup record exists
  const existing =
    await MyGlobal.prisma.discussion_board_backup_records.findUniqueOrThrow({
      where: { id: props.backupRecordId },
    });
  // Validate status transitions if status is being updated
  if (props.body.status !== undefined) {
    // Cannot revert from 'completed' to earlier statuses
    if (existing.status === "completed" && props.body.status !== "completed") {
      throw new HttpException(
        "Cannot change status from completed to another status",
        400,
      );
    }
    // Cannot revert from 'failed' to 'completed' (should go through 'in_progress' first)
    if (existing.status === "failed" && props.body.status === "completed") {
      throw new HttpException(
        "Cannot directly change status from failed to completed",
        400,
      );
    }
  }
  // Validate completed_at is after started_at if provided
  if (props.body.completed_at !== undefined) {
    // Compare ISO strings lexicographically (works for ISO dates)
    if (props.body.completed_at <= existing.started_at.toISOString()) {
      throw new HttpException("completed_at must be after started_at", 400);
    }
  }
  // Validate size_bytes is positive if provided
  if (props.body.size_bytes !== undefined && props.body.size_bytes < 0) {
    throw new HttpException("size_bytes must be a positive integer", 400);
  }
  // Validate file path naming convention if provided
  if (props.body.file_path !== undefined && props.body.file_path !== null) {
    // Basic validation: should end with .bak, .tar.gz, .zip, etc.
    const validExtensions = [".bak", ".tar.gz", ".tar", ".zip", ".gz"];
    const hasValidExtension = validExtensions.some((ext) =>
      props.body.file_path!.endsWith(ext),
    );
    if (!hasValidExtension) {
      throw new HttpException(
        "file_path must have a valid backup file extension (.bak, .tar.gz, .zip, etc.)",
        400,
      );
    }
  }
  // Prepare update data with proper Prisma types
  const updateData: Prisma.discussion_board_backup_recordsUpdateInput = {
    updated_at: new Date(),
  };
  // Add optional fields if provided
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.file_path !== undefined) {
    updateData.file_path =
      props.body.file_path === null ? null : props.body.file_path;
  }
  if (props.body.size_bytes !== undefined) {
    updateData.size_bytes =
      props.body.size_bytes === undefined ? undefined : props.body.size_bytes;
  }
  if (props.body.completed_at !== undefined) {
    updateData.completed_at =
      props.body.completed_at === null
        ? null
        : new Date(props.body.completed_at);
  }
  if (props.body.error_message !== undefined) {
    updateData.error_message =
      props.body.error_message === null ? null : props.body.error_message;
  }
  // Execute the update
  await MyGlobal.prisma.discussion_board_backup_records.update({
    where: { id: props.backupRecordId },
    data: updateData,
  });
  // Fetch the updated record with transformer select
  const updated =
    await MyGlobal.prisma.discussion_board_backup_records.findUniqueOrThrow({
      where: { id: props.backupRecordId },
      ...DiscussionBoardBackupRecordTransformer.select(),
    });
  // Transform and return
  return await DiscussionBoardBackupRecordTransformer.transform(updated);
}
