import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformVoteHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformVoteHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformUserCommentsCommentIdVoteHistory(props: {
  user: UserPayload;
  commentId: string;
}): Promise<IRedditPlatformVoteHistory.IRequest> {
  const voteHistories =
    await MyGlobal.prisma.reddit_platform_vote_histories.findMany({
      where: {
        vote_target_type: "comment",
        vote_target_id: props.commentId,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  return {
    data: voteHistories.map((record) => ({
      id: record.id,
      user_id: record.user_id,
      vote_target_type: record.vote_target_type,
      vote_target_id: record.vote_target_id,
      vote_type: record.vote_type,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
  };
}
