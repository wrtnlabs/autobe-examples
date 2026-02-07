import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardBanRecordCollector } from "../collectors/DiscussionBoardBanRecordCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBanRecordTransformer } from "../transformers/DiscussionBoardBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminBanRecords(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBanRecord.ICreate;
}): Promise<IDiscussionBoardBanRecord> {
  // Validate ban_reason is non-empty
  if (!props.body.ban_reason.trim()) {
    throw new HttpException("Ban reason cannot be empty", 400);
  }
  // Validate ban_status is one of allowed values
  const allowedStatuses = ["active", "expired", "revoked"];
  if (!allowedStatuses.includes(props.body.ban_status)) {
    throw new HttpException("Invalid ban status", 400);
  }
  // Validate ban_duration_days is positive integer or null
  if (
    props.body.ban_duration_days !== null &&
    props.body.ban_duration_days !== undefined
  ) {
    if (
      !Number.isInteger(props.body.ban_duration_days) ||
      props.body.ban_duration_days < 1
    ) {
      throw new HttpException("Ban duration must be a positive integer", 400);
    }
  }
  // Use collector to prepare data
  const data = await DiscussionBoardBanRecordCollector.collect({
    body: props.body,
  });
  // Create the ban record
  const created = await MyGlobal.prisma.discussion_board_ban_records.create({
    data,
    ...DiscussionBoardBanRecordTransformer.select(),
  });
  // Note: The specification mentions administrator attribution records,
  // but since the database schema doesn't show the subtype tables and
  // the collector doesn't handle them, we'll create the core ban record.
  // Administrator attribution would require additional database operations
  // that aren't defined in the current schema.
  // Transform and return the result
  return await DiscussionBoardBanRecordTransformer.transform(created);
}
