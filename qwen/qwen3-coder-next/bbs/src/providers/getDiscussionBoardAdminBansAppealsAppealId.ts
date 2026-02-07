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

export async function getDiscussionBoardAdminBansAppealsAppealId(props: {
  admin: AdminPayload;
  appealId: string;
}): Promise<IDiscussionBoardBansAppeal> {
  const appeal = await MyGlobal.prisma.discussion_board_bans_appeals.findUnique(
    {
      where: { id: props.appealId },
      select: {
        id: true,
        ban_record_id: true,
        user_id: true,
        reviewed_by_id: true,
        appeal_reason: true,
        status: true,
        review_notes: true,
        appeal_created_at: true,
        reviewed_at: true,
      },
    },
  );
  if (!appeal) {
    throw new HttpException("Ban appeal not found", 404);
  }
  return {
    id: appeal.id as string & tags.Format<"uuid">,
    ban_record_id: appeal.ban_record_id as string & tags.Format<"uuid">,
    user_id: appeal.user_id as string & tags.Format<"uuid">,
    reviewed_by_id: appeal.reviewed_by_id
      ? (appeal.reviewed_by_id as string & tags.Format<"uuid">)
      : null,
    appeal_reason: appeal.appeal_reason,
    status: appeal.status,
    review_notes: appeal.review_notes,
    appeal_created_at: toISOStringSafe(appeal.appeal_created_at),
    reviewed_at: appeal.reviewed_at
      ? toISOStringSafe(appeal.reviewed_at)
      : null,
  };
}
