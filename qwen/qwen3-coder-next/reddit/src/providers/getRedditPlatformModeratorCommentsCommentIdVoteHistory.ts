import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformVoteHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformVoteHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformModeratorCommentsCommentIdVoteHistory(props: {
  moderator: ModeratorPayload;
  commentId: string;
}): Promise<IRedditPlatformVoteHistory.IRequest> {
  const voteHistories =
    await MyGlobal.prisma.reddit_platform_vote_histories.findMany({
      where: {
        vote_target_id: props.commentId,
        vote_target_type: "comment",
      },
      orderBy: {
        created_at: "desc",
      },
    });
  return {
    data: voteHistories.map((history) => ({
      id: history.id,
      user_id: history.user_id,
      vote_target_type: history.vote_target_type,
      vote_target_id: history.vote_target_id,
      vote_type: history.vote_type,
      created_at: toISOStringSafe(history.created_at),
      updated_at: toISOStringSafe(history.updated_at),
    })),
  };
}
