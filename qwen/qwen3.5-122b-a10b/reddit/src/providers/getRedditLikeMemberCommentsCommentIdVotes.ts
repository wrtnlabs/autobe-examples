import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeVote";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeVoteAtSummaryTransformer } from "../transformers/RedditLikeVoteAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditLikeVote.ISummary> {
  // Validate comment exists - returns 404 if not found
  await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    reddit_like_comment_id: props.commentId,
    deleted_at: null,
  } satisfies Prisma.reddit_like_votesWhereInput;
  const records = await MyGlobal.prisma.reddit_like_votes.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...RedditLikeVoteAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_votes.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditLikeVoteAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditLikeVote.ISummary;
}
