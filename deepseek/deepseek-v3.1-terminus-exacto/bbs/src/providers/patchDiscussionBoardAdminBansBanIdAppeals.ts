import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBanAppealTransformer } from "../transformers/DiscussionBoardBanAppealTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminBansBanIdAppeals(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanAppeal.IUpdate;
}): Promise<IDiscussionBoardBanAppeal> {
  // First verify the ban record exists
  const banRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findUnique({
      where: { id: props.banId },
    });
  if (!banRecord) {
    throw new HttpException("Ban record not found", 404);
  }
  // Find the appeal record linked to this ban
  const appeal = await MyGlobal.prisma.discussion_board_ban_appeals.findFirst({
    where: {
      discussion_board_ban_record_id: props.banId,
      deleted_at: null,
    },
    ...DiscussionBoardBanAppealTransformer.select(),
  });
  if (!appeal) {
    throw new HttpException("Ban appeal not found", 404);
  }
  // Validate workflow state transitions
  const currentStatus = appeal.status;
  const newStatus = props.body.status ?? currentStatus;
  // Valid status transitions
  const validTransitions: Record<string, string[]> = {
    pending: ["under_review"],
    under_review: ["approved", "rejected"],
    approved: [],
    rejected: [],
  };
  if (props.body.status && currentStatus !== props.body.status) {
    if (!validTransitions[currentStatus]?.includes(props.body.status)) {
      throw new HttpException(
        `Invalid status transition from ${currentStatus} to ${props.body.status}`,
        400,
      );
    }
  }
  // Prepare update data with proper Prisma types
  const updateData: Prisma.discussion_board_ban_appealsUpdateInput = {
    status: newStatus,
    decision_reason: props.body.decision_reason ?? appeal.decision_reason,
    updated_at: toISOStringSafe(new Date()),
  };
  // If status is changing to approved or rejected, set reviewer and reviewed_at
  if (
    props.body.status &&
    ["approved", "rejected"].includes(props.body.status)
  ) {
    updateData.reviewer = { connect: { id: props.admin.id } };
    updateData.reviewed_at = toISOStringSafe(new Date());
    // Validate decision_reason is provided for approved/rejected status
    if (
      !props.body.decision_reason ||
      props.body.decision_reason.trim().length === 0
    ) {
      throw new HttpException(
        "Decision reason is required when approving or rejecting an appeal",
        400,
      );
    }
  }
  // Update the appeal record
  const updatedAppeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.update({
      where: { id: appeal.id },
      data: updateData,
      ...DiscussionBoardBanAppealTransformer.select(),
    });
  return await DiscussionBoardBanAppealTransformer.transform(updatedAppeal);
}
