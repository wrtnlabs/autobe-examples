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

export async function postDiscussionBoardAdminBanRecordsBanIdUnban(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardBanRecord> {
  // Find ban record - throws 404 if not found
  const banRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findUniqueOrThrow({
      where: { id: props.banId },
    });
  // Check if already unbanned
  if (banRecord.unbanned_at !== null) {
    throw new HttpException("User is already unbanned", 400);
  }
  // Verify member exists before updating
  await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
    where: { id: banRecord.discussion_board_member_id },
  });
  // Update member ban status to active
  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: banRecord.discussion_board_member_id },
    data: {
      ban_status: "active",
      ban_reason: null,
    },
  });
  // Update ban record with unbanned_at timestamp
  const now = new Date();
  await MyGlobal.prisma.discussion_board_ban_records.update({
    where: { id: props.banId },
    data: {
      unbanned_at: now,
      updated_at: now,
    },
  });
  // Return updated ban record using transformer
  const updated =
    await MyGlobal.prisma.discussion_board_ban_records.findUniqueOrThrow({
      where: { id: props.banId },
      ...DiscussionBoardBanRecordTransformer.select(),
    });
  return await DiscussionBoardBanRecordTransformer.transform(updated);
}
