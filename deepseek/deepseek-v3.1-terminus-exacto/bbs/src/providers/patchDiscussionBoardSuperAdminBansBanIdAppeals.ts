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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardBanAppealTransformer } from "../transformers/DiscussionBoardBanAppealTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminBansBanIdAppeals(props: {
  superAdmin: SuperadminPayload;
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanAppeal.IUpdate;
}): Promise<IDiscussionBoardBanAppeal> {
  // Validate ban record exists
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
    throw new HttpException("No appeal found for this ban record", 404);
  }
  // Validate workflow transitions if status is being updated
  const currentStatus = appeal.status;
  const newStatus = props.body.status;
  if (
    newStatus !== undefined &&
    newStatus !== null &&
    newStatus !== currentStatus
  ) {
    const validTransitions: Record<string, string[]> = {
      pending: ["under_review"],
      under_review: ["approved", "rejected"],
      approved: [],
      rejected: [],
    };
    if (
      currentStatus !== null &&
      !(validTransitions[currentStatus] ?? []).includes(newStatus)
    ) {
      throw new HttpException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400,
      );
    }
    // Require decision reason for final decisions
    if (
      (newStatus === "approved" || newStatus === "rejected") &&
      (!props.body.decision_reason || !props.body.decision_reason.trim())
    ) {
      throw new HttpException(
        "Decision reason is required for approved or rejected appeals",
        400,
      );
    }
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_ban_appealsUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.status !== undefined && props.body.status !== null) {
    updateData.status = props.body.status;
  }
  if (props.body.decision_reason !== undefined) {
    updateData.decision_reason = props.body.decision_reason;
  }
  // Set reviewer and review timestamp for status changes to approved/rejected
  if (
    newStatus !== undefined &&
    newStatus !== null &&
    newStatus !== currentStatus &&
    (newStatus === "approved" || newStatus === "rejected")
  ) {
    updateData.reviewed_at = toISOStringSafe(new Date());
    updateData.reviewer = { connect: { id: props.superAdmin.id } };
  }
  // Update the appeal
  const updatedAppeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.update({
      where: { id: appeal.id },
      data: updateData,
      ...DiscussionBoardBanAppealTransformer.select(),
    });
  return await DiscussionBoardBanAppealTransformer.transform(updatedAppeal);
}
