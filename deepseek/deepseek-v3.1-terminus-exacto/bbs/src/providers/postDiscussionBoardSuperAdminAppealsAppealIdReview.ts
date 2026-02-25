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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardBanAppealTransformer } from "../transformers/DiscussionBoardBanAppealTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminAppealsAppealIdReview(props: {
  superAdmin: SuperAdminPayload;
  appealId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanAppeal.IReview;
}): Promise<IDiscussionBoardBanAppeal> {
  // Find the appeal and validate it's not deleted
  const existingAppeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.findUniqueOrThrow({
      where: {
        id: props.appealId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        discussion_board_admin_id: true,
      },
    });
  // Validate appeal is in a reviewable status
  if (!["pending", "under_review"].includes(existingAppeal.status)) {
    if (["approved", "rejected"].includes(existingAppeal.status)) {
      throw new HttpException("Appeal has already been decided", 400);
    }
    throw new HttpException("Appeal is not in a reviewable status", 400);
  }
  const now = toISOStringSafe(new Date());
  // Update the appeal with review decision
  await MyGlobal.prisma.discussion_board_ban_appeals.update({
    where: { id: props.appealId },
    data: {
      status: props.body.status,
      decision_reason: props.body.decision_reason,
      discussion_board_admin_id: props.superAdmin.id,
      reviewed_at: now,
      updated_at: now,
    },
  });
  // Fetch the complete updated appeal with all relations
  const updatedAppeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.findUniqueOrThrow({
      where: { id: props.appealId },
      ...DiscussionBoardBanAppealTransformer.select(),
    });
  return DiscussionBoardBanAppealTransformer.transform(updatedAppeal);
}
