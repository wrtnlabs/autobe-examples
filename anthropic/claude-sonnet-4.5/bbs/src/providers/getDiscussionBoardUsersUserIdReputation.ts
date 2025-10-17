import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUserReputation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserReputation";

export async function getDiscussionBoardUsersUserIdReputation(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserReputation> {
  const { userId } = props;

  const reputation =
    await MyGlobal.prisma.discussion_board_user_reputation.findFirst({
      where: {
        discussion_board_member_id: userId,
      },
    });

  if (!reputation) {
    throw new HttpException("User reputation not found", 404);
  }

  return {
    id: reputation.id,
    discussion_board_member_id: reputation.discussion_board_member_id,
    total_score: reputation.total_score,
    upvotes_received: reputation.upvotes_received,
    downvotes_received: reputation.downvotes_received,
    topics_score: reputation.topics_score,
    replies_score: reputation.replies_score,
    updated_at: toISOStringSafe(reputation.updated_at),
  };
}
