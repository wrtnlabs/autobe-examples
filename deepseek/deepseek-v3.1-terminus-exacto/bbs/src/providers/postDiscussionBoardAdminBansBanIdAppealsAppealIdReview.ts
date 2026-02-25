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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postDiscussionBoardAdminBansBanIdAppealsAppealIdReview(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  appealId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanAppeal.IReview;
}): Promise<IDiscussionBoardBanAppeal> {
  // Validate appeal exists and is in reviewable state
  await MyGlobal.prisma.discussion_board_ban_appeals.findFirstOrThrow({
    where: {
      id: props.appealId,
      discussion_board_ban_record_id: props.banId,
      status: {
        in: ["pending", "under_review"],
      },
      deleted_at: null,
    },
  });
  // Update appeal with review decision
  const now = new Date();
  await MyGlobal.prisma.discussion_board_ban_appeals.update({
    where: { id: props.appealId },
    data: {
      status: props.body.status,
      decision_reason: props.body.decision_reason ?? null,
      reviewer: {
        connect: { id: props.admin.id },
      },
      reviewed_at: now,
      updated_at: now,
    },
  });
  // Fetch updated appeal with transformer
  const updated =
    await MyGlobal.prisma.discussion_board_ban_appeals.findUniqueOrThrow({
      where: { id: props.appealId },
      ...DiscussionBoardBanAppealTransformer.select(),
    });
  return await DiscussionBoardBanAppealTransformer.transform(updated);
}
