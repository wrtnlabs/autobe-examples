import { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityCommentVoteAtSummaryTransformer } from "../transformers/CommunityCommentVoteAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPostsPostIdCommentsCommentIdVotes(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityCommentVote.IRequest;
}): Promise<IPageICommunityCommentVote.ISummary> {
  // 1. Validate post exists and is not deleted
  await MyGlobal.prisma.community_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // 2. Validate comment exists, is not deleted, and belongs to the given post
  await MyGlobal.prisma.community_comments.findFirstOrThrow({
    where: {
      id: props.commentId,
      post_id: props.postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // 3. Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 4. Build WHERE clause
  const whereInput = {
    community_comment_id: props.commentId,
    deleted_at: null,
    ...(props.body.voteType != null && { vote_type: props.body.voteType }),
  } satisfies Prisma.community_comment_votesWhereInput;
  // 5. Query votes (ordered by created_at ascending)
  const data = await MyGlobal.prisma.community_comment_votes.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "asc" },
    ...CommunityCommentVoteAtSummaryTransformer.select(),
  });
  // 6. Count total (sequential after findMany)
  const total = await MyGlobal.prisma.community_comment_votes.count({
    where: whereInput,
  });
  // 7. Transform
  const items = await ArrayUtil.asyncMap(
    data,
    CommunityCommentVoteAtSummaryTransformer.transform,
  );
  // 8. Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: items,
  };
}
