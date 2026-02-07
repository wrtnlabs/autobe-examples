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

export async function putDiscussionBoardAdminBansAppealsAppealId(props: {
  admin: AdminPayload;
  appealId: string;
  body: IDiscussionBoardBansAppeal.IUpdate;
}): Promise<IDiscussionBoardBansAppeal> {
  const appeal = await MyGlobal.prisma.discussion_board_bans_appeals.update({
    where: {
      id: props.appealId,
    },
    data: {
      reviewed_by_id: props.admin.id,
      reviewed_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: appeal.id,
    ban_record_id: appeal.ban_record_id,
    user_id: appeal.user_id,
    reviewed_by_id: appeal.reviewed_by_id,
    appeal_reason: appeal.appeal_reason,
    status: appeal.status,
    review_notes: appeal.review_notes,
    appeal_created_at: appeal.appeal_created_at,
    reviewed_at: appeal.reviewed_at,
  };
}
