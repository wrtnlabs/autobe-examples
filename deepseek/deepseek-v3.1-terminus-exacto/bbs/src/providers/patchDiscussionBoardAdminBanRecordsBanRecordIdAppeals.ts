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

export async function patchDiscussionBoardAdminBanRecordsBanRecordIdAppeals(props: {
  admin: AdminPayload;
  banRecordId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanAppeal.IUpdate;
}): Promise<IDiscussionBoardBanAppeal> {
  // First, verify the ban record exists
  const banRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findUnique({
      where: { id: props.banRecordId },
    });
  if (!banRecord) {
    throw new HttpException("Ban record not found", 404);
  }
  // Find the existing appeal for this ban record
  const existingAppeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.findFirst({
      where: {
        discussion_board_ban_record_id: props.banRecordId,
        deleted_at: null,
      },
      ...DiscussionBoardBanAppealTransformer.select(),
    });
  if (!existingAppeal) {
    throw new HttpException("Ban appeal not found", 404);
  }
  // Validate status transitions
  const validStatuses = ["pending", "under_review", "approved", "rejected"];
  if (
    props.body.status !== undefined &&
    props.body.status !== null &&
    !validStatuses.includes(props.body.status)
  ) {
    throw new HttpException(
      `Invalid status: ${props.body.status}. Valid statuses are: ${validStatuses.join(", ")}`,
      400,
    );
  }
  // Handle null status by keeping current status
  const newStatus =
    props.body.status !== undefined && props.body.status !== null
      ? props.body.status
      : existingAppeal.status;
  // Check if status is changing from pending/under_review to approved/rejected
  const isFinalDecision =
    ["approved", "rejected"].includes(newStatus) &&
    ["pending", "under_review"].includes(existingAppeal.status);
  // decision_reason is required when making final decision
  if (
    isFinalDecision &&
    (!props.body.decision_reason ||
      props.body.decision_reason.trim().length === 0)
  ) {
    throw new HttpException(
      "Decision reason is required when approving or rejecting an appeal",
      400,
    );
  }
  // Handle null decision_reason
  const newDecisionReason =
    props.body.decision_reason !== undefined
      ? props.body.decision_reason
      : existingAppeal.decision_reason;
  // Prepare update data
  const updateData: any = {
    status: newStatus,
    decision_reason: newDecisionReason,
    updated_at: toISOStringSafe(new Date().toISOString()), // Convert Date to ISO string first
  };
  // Set reviewer and reviewed_at when making final decision
  if (isFinalDecision) {
    updateData.discussion_board_admin_id = props.admin.id;
    updateData.reviewed_at = toISOStringSafe(new Date().toISOString()); // Convert Date to ISO string first
  }
  // Update the appeal
  const updatedAppeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.update({
      where: { id: existingAppeal.id },
      data: updateData,
      ...DiscussionBoardBanAppealTransformer.select(),
    });
  return await DiscussionBoardBanAppealTransformer.transform(updatedAppeal);
}
