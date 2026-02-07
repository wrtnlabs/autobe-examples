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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardBackupRecordTransformer } from "../transformers/DiscussionBoardBackupRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminBackupRecordsRecordId(props: {
  superAdmin: SuperadminPayload;
  recordId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBackupRecord.IUpdate;
}): Promise<IDiscussionBoardBackupRecord> {
  // First, check if the backup record exists
  const existingRecord =
    await MyGlobal.prisma.discussion_board_backup_records.findUnique({
      where: {
        id: props.recordId,
        deleted_at: null,
      },
      ...DiscussionBoardBackupRecordTransformer.select(),
    });
  if (!existingRecord) {
    throw new HttpException("Backup record not found", 404);
  }
  // Prepare update data with proper Prisma update operations
  const updateData: Prisma.discussion_board_backup_recordsUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  // Handle nullable fields by converting null to undefined
  if (props.body.status !== undefined && props.body.status !== null) {
    updateData.status = { set: props.body.status };
  }
  if (props.body.file_path !== undefined && props.body.file_path !== null) {
    updateData.file_path = { set: props.body.file_path };
  }
  if (props.body.size_bytes !== undefined && props.body.size_bytes !== null) {
    updateData.size_bytes = { set: props.body.size_bytes };
  }
  if (
    props.body.completed_at !== undefined &&
    props.body.completed_at !== null
  ) {
    updateData.completed_at = { set: props.body.completed_at };
  }
  if (
    props.body.error_message !== undefined &&
    props.body.error_message !== null
  ) {
    updateData.error_message = { set: props.body.error_message };
  }
  // Perform the update
  const updatedRecord =
    await MyGlobal.prisma.discussion_board_backup_records.update({
      where: { id: props.recordId },
      data: updateData,
      ...DiscussionBoardBackupRecordTransformer.select(),
    });
  return await DiscussionBoardBackupRecordTransformer.transform(updatedRecord);
}
