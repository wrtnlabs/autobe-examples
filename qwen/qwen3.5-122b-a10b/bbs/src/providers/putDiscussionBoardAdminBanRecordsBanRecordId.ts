import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBanRecordTransformer } from "../transformers/DiscussionBoardBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminBanRecordsBanRecordId(props: {
  admin: AdminPayload;
  banRecordId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanRecord.IUpdate;
}): Promise<IDiscussionBoardBanRecord> {
  // Step 1: Retrieve the ban record (404 if not found)
  const banRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findUniqueOrThrow({
      where: { id: props.banRecordId },
      select: { id: true, unbanned_at: true },
    });
  // Step 2: Validation - if unban is requested, verify user is currently banned
  if (props.body.unbanned_at !== undefined) {
    if (banRecord.unbanned_at !== null) {
      throw new HttpException("User is already unbanned", 409);
    }
  }
  // Step 3: Build update data (Prisma accepts ISO strings for DateTime fields)
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const updateData: Prisma.discussion_board_ban_recordsUpdateInput = {
    ...(props.body.reason !== undefined && { reason: props.body.reason }),
    ...(props.body.unbanned_at !== undefined && {
      unbanned_at: props.body.unbanned_at,
    }),
    updated_at: now,
  };
  // Step 4: Execute update
  await MyGlobal.prisma.discussion_board_ban_records.update({
    where: { id: props.banRecordId },
    data: updateData,
  });
  // Step 5: Fetch and transform updated record
  const updated =
    await MyGlobal.prisma.discussion_board_ban_records.findUniqueOrThrow({
      where: { id: props.banRecordId },
      ...DiscussionBoardBanRecordTransformer.select(),
    });
  return await DiscussionBoardBanRecordTransformer.transform(updated);
}
