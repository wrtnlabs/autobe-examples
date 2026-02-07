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

export async function putDiscussionBoardAdminBanRecordsBanRecordIdAppealsAppealId(props: {
  admin: AdminPayload;
  banRecordId: string & tags.Format<"uuid">;
  appealId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanAppeal.IUpdate;
}): Promise<IDiscussionBoardBanAppeal> {
  // Verify ban record exists
  const banRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findUnique({
      where: { id: props.banRecordId },
    });
  if (!banRecord) {
    throw new HttpException("Ban record not found", 404);
  }
  // Get the appeal with its current state
  const appeal = await MyGlobal.prisma.discussion_board_ban_appeals.findUnique({
    where: { id: props.appealId },
    ...DiscussionBoardBanAppealTransformer.select(),
  });
  if (!appeal) {
    throw new HttpException("Ban appeal not found", 404);
  }
  // Verify appeal belongs to the specified ban record
  if (appeal.banRecord.id !== props.banRecordId) {
    throw new HttpException(
      "Appeal does not belong to the specified ban record",
      400,
    );
  }
  // Check if appeal is already reviewed
  if (appeal.status === "approved" || appeal.status === "rejected") {
    throw new HttpException(
      "Appeal has already been reviewed and cannot be modified",
      400,
    );
  }
  // Validate status transition
  const newStatus = props.body.status ?? appeal.status;
  const validStatuses = ["pending", "under_review", "approved", "rejected"];
  if (!validStatuses.includes(newStatus)) {
    throw new HttpException("Invalid appeal status", 400);
  }
  // Validate decision reason requirements
  const newDecisionReason =
    props.body.decision_reason ?? appeal.decision_reason;
  if (
    (newStatus === "approved" || newStatus === "rejected") &&
    !newDecisionReason
  ) {
    throw new HttpException(
      "Decision reason is required when approving or rejecting an appeal",
      400,
    );
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_ban_appealsUpdateInput = {
    status: newStatus,
    decision_reason: newDecisionReason,
    updated_at: toISOStringSafe(new Date()),
  };
  // Set reviewed_at and reviewer when status changes to approved/rejected
  if (
    props.body.status &&
    (props.body.status === "approved" || props.body.status === "rejected")
  ) {
    updateData.reviewed_at = toISOStringSafe(new Date());
    updateData.reviewer = { connect: { id: props.admin.id } };
  }
  // Update the appeal
  const updatedAppeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.update({
      where: { id: props.appealId },
      data: updateData,
      ...DiscussionBoardBanAppealTransformer.select(),
    });
  return await DiscussionBoardBanAppealTransformer.transform(updatedAppeal);
}
