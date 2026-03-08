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

export async function putDiscussionBoardAdminBanRecordsBanId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanRecord.IUpdate;
}): Promise<IDiscussionBoardBanRecord> {
  // Find the ban record
  const banRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findUniqueOrThrow({
      where: { id: props.banId },
      select: { id: true, unbanned_at: true, discussion_board_member_id: true },
    });
  // Verify ban is active (unbanned_at is null)
  if (banRecord.unbanned_at !== null) {
    throw new HttpException("User is not banned", 400);
  }
  // Update ban record and member ban status in a transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_ban_records.update({
      where: { id: props.banId },
      data: {
        unbanned_at: new Date(),
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.discussion_board_members.update({
      where: { id: banRecord.discussion_board_member_id },
      data: {
        ban_status: "active",
        updated_at: new Date(),
      },
    }),
  ]);
  // Re-fetch the updated ban record with full data
  const updated =
    await MyGlobal.prisma.discussion_board_ban_records.findUniqueOrThrow({
      where: { id: props.banId },
      ...DiscussionBoardBanRecordTransformer.select(),
    });
  return await DiscussionBoardBanRecordTransformer.transform(updated);
}
