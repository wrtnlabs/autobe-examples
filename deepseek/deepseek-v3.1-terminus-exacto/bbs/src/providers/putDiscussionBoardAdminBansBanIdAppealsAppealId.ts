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

export async function putDiscussionBoardAdminBansBanIdAppealsAppealId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  appealId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanAppeal.IUpdate;
}): Promise<IDiscussionBoardBanAppeal> {
  // Find the appeal and verify it belongs to the specified ban
  const appeal = await MyGlobal.prisma.discussion_board_ban_appeals.findFirst({
    where: {
      id: props.appealId,
      discussion_board_ban_record_id: props.banId,
      deleted_at: null,
    },
    ...DiscussionBoardBanAppealTransformer.select(),
  });
  if (!appeal) {
    throw new HttpException("Ban appeal not found", 404);
  }
  // Validate workflow transitions
  const currentStatus = appeal.status;
  const newStatus = props.body.status;
  // Cannot modify status after final decision
  if (
    newStatus !== undefined &&
    newStatus !== null &&
    (currentStatus === "approved" || currentStatus === "rejected")
  ) {
    throw new HttpException(
      "Cannot modify appeal status after final decision",
      400,
    );
  }
  // Validate valid status transitions
  if (newStatus !== undefined && newStatus !== null) {
    const validTransitions: Record<string, string[]> = {
      pending: ["under_review"],
      under_review: ["approved", "rejected"],
      approved: [],
      rejected: [],
    };
    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new HttpException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400,
      );
    }
  }
  // Validate decision_reason requirements
  const finalDecisionStatuses = ["approved", "rejected"];
  if (
    props.body.status !== undefined &&
    props.body.status !== null &&
    finalDecisionStatuses.includes(props.body.status) &&
    (!props.body.decision_reason || !props.body.decision_reason.trim())
  ) {
    throw new HttpException(
      "Decision reason is required for approval or rejection",
      400,
    );
  }
  // Prepare update data
  const now = toISOStringSafe(new Date());
  const updateData: Prisma.discussion_board_ban_appealsUpdateInput = {
    updated_at: now,
  };
  // Handle status update if provided
  if (props.body.status !== undefined && props.body.status !== null) {
    updateData.status = props.body.status;
    // Set reviewed_at and reviewer when moving to final decision states
    if (
      finalDecisionStatuses.includes(props.body.status) &&
      (currentStatus === "pending" || currentStatus === "under_review")
    ) {
      updateData.reviewed_at = now;
      updateData.reviewer = { connect: { id: props.admin.id } };
    }
  }
  // Handle decision_reason separately to ensure proper null handling
  if (props.body.decision_reason !== undefined) {
    updateData.decision_reason = props.body.decision_reason;
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
