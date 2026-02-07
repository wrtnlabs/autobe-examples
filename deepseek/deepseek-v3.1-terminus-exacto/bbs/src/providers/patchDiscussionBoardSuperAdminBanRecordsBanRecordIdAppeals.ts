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

export async function patchDiscussionBoardSuperAdminBanRecordsBanRecordIdAppeals(props: {
  superAdmin: SuperadminPayload;
  banRecordId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanAppeal.IUpdate;
}): Promise<IDiscussionBoardBanAppeal> {
  // Validate ban record exists
  const banRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findUnique({
      where: { id: props.banRecordId },
    });
  if (!banRecord) {
    throw new HttpException("Ban record not found", 404);
  }
  // Find the associated ban appeal
  const appeal = await MyGlobal.prisma.discussion_board_ban_appeals.findFirst({
    where: {
      discussion_board_ban_record_id: props.banRecordId,
      deleted_at: null,
    },
    ...DiscussionBoardBanAppealTransformer.select(),
  });
  if (!appeal) {
    throw new HttpException("Ban appeal not found", 404);
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_ban_appealsUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  // Update status if provided
  if (props.body.status !== undefined) {
    updateData.status =
      props.body.status !== null ? props.body.status : undefined;
    // Set reviewed_at and reviewer when status changes from pending/under_review to approved/rejected
    if (
      (appeal.status === "pending" || appeal.status === "under_review") &&
      (props.body.status === "approved" || props.body.status === "rejected")
    ) {
      updateData.reviewed_at = toISOStringSafe(new Date());
      updateData.reviewer = { connect: { id: props.superAdmin.id } };
    }
  }
  // Update decision_reason if provided
  if (props.body.decision_reason !== undefined) {
    updateData.decision_reason =
      props.body.decision_reason !== null
        ? props.body.decision_reason
        : undefined;
  }
  // Perform the update
  const updatedAppeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.update({
      where: { id: appeal.id },
      data: updateData,
      ...DiscussionBoardBanAppealTransformer.select(),
    });
  return await DiscussionBoardBanAppealTransformer.transform(updatedAppeal);
}
