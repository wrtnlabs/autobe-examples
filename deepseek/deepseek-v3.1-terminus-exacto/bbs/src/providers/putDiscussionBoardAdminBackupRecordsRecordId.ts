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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putDiscussionBoardAdminBackupRecordsRecordId(props: {
  admin: AdminPayload;
  recordId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBackupRecord.IUpdate;
}): Promise<IDiscussionBoardBackupRecord> {
  // Check if backup record exists
  const existingRecord =
    await MyGlobal.prisma.discussion_board_backup_records.findUnique({
      where: { id: props.recordId, deleted_at: null },
    });
  if (!existingRecord) {
    throw new HttpException("Backup record not found", 404);
  }
  // Validate status transitions - cannot move from completed back to in_progress
  if (
    existingRecord.status === "completed" &&
    props.body.status === "in_progress"
  ) {
    throw new HttpException(
      "Cannot move completed backup back to in_progress",
      400,
    );
  }
  // Build update data using proper Prisma syntax
  const updateData: Prisma.discussion_board_backup_recordsUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  // Handle optional fields with proper Prisma update syntax
  if (props.body.status !== undefined) {
    updateData.status =
      props.body.status !== null ? props.body.status : undefined;
  }
  if (props.body.file_path !== undefined) {
    updateData.file_path =
      props.body.file_path !== null ? props.body.file_path : undefined;
  }
  if (props.body.size_bytes !== undefined) {
    updateData.size_bytes =
      props.body.size_bytes !== null ? props.body.size_bytes : undefined;
  }
  if (props.body.completed_at !== undefined) {
    updateData.completed_at =
      props.body.completed_at !== null
        ? toISOStringSafe(new Date(props.body.completed_at))
        : null;
  }
  if (props.body.error_message !== undefined) {
    updateData.error_message =
      props.body.error_message !== null ? props.body.error_message : undefined;
  }
  // Update the record and return transformed response using the transformer
  const updatedRecord =
    await MyGlobal.prisma.discussion_board_backup_records.update({
      where: { id: props.recordId },
      data: updateData,
      ...DiscussionBoardBackupRecordTransformer.select(),
    });
  return await DiscussionBoardBackupRecordTransformer.transform(updatedRecord);
}
