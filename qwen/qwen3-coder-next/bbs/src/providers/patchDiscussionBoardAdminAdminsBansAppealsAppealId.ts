import { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAdminsBansAppealsAppealId(props: {
  admin: AdminPayload;
  appealId: string;
  body: IDiscussionBoardBansAppeal.IRequest;
}): Promise<IDiscussionBoardBansAppeal> {
  // Validate appeal exists
  const appeal = await MyGlobal.prisma.discussion_board_bans_appeals.findUnique(
    {
      where: { id: props.appealId },
    },
  );
  if (!appeal) {
    throw new HttpException("Ban appeal not found", 404);
  }
  // Process the appeal based on decision
  // Since body has no fields, we can only use the appeal's existing data
  const updatedAppeal =
    await MyGlobal.prisma.discussion_board_bans_appeals.update({
      where: { id: props.appealId },
      data: {
        status: appeal.status, // Keep existing status
        review_notes: appeal.review_notes, // Keep existing review notes
        reviewed_at: toISOStringSafe(new Date()),
        reviewed_by_id: props.admin.id,
      },
    });
  // If approved, unban the user
  if (updatedAppeal.status === "approved") {
    if (updatedAppeal.ban_record_id) {
      // Remove the ban record
      await MyGlobal.prisma.discussion_board_bans_ban_records.delete({
        where: { id: updatedAppeal.ban_record_id },
      });
    }
  }
  return {
    id: updatedAppeal.id,
    ban_record_id: updatedAppeal.ban_record_id,
    user_id: updatedAppeal.user_id,
    status: updatedAppeal.status,
    reason: updatedAppeal.appeal_reason,
    review_notes: updatedAppeal.review_notes,
    submitted_at: toISOStringSafe(updatedAppeal.appeal_created_at),
    processed_at: updatedAppeal.reviewed_at
      ? toISOStringSafe(updatedAppeal.reviewed_at)
      : null,
    processed_by_id: updatedAppeal.reviewed_by_id,
  };
}
