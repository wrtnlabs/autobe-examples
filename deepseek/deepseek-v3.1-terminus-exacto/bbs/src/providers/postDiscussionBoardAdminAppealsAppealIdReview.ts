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

export async function postDiscussionBoardAdminAppealsAppealIdReview(props: {
  admin: AdminPayload;
  appealId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanAppeal.IReview;
}): Promise<IDiscussionBoardBanAppeal> {
  // Validate ban appeal exists and is in reviewable status
  const appeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.findUniqueOrThrow({
      where: {
        id: props.appealId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        reviewed_at: true,
      },
    });
  // Check if appeal is already reviewed
  if (appeal.reviewed_at !== null) {
    throw new HttpException("Ban appeal has already been reviewed", 400);
  }
  // Validate appeal is in reviewable status
  if (!["pending", "under_review"].includes(appeal.status)) {
    throw new HttpException("Ban appeal is not in a reviewable status", 400);
  }
  // Validation: decision reason required for rejected appeals
  if (
    props.body.status === "rejected" &&
    (!props.body.decision_reason ||
      props.body.decision_reason.trim().length === 0)
  ) {
    throw new HttpException(
      "Decision reason is required when rejecting an appeal",
      400,
    );
  }
  const now = new Date().toISOString();
  // Update the ban appeal with review decision
  const updatedAppeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.update({
      where: { id: props.appealId },
      data: {
        status: props.body.status,
        decision_reason: props.body.decision_reason,
        discussion_board_admin_id: props.admin.id,
        reviewed_at: now,
        updated_at: now,
      },
      ...DiscussionBoardBanAppealTransformer.select(),
    });
  return await DiscussionBoardBanAppealTransformer.transform(updatedAppeal);
}
