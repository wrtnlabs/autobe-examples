import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityCommentAtSummaryTransformer } from "../transformers/CommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPostsPostIdComments(props: {
  postId: string;
  body: ICommunityComment.IRequest;
}): Promise<IPageICommunityComment.ISummary> {
  // Validate post exists and is not deleted
  await MyGlobal.prisma.community_posts.findUniqueOrThrow({
    where: { id: props.postId, is_deleted: false },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "best";
  const whereClause = {
    community_post_id: props.postId,
    parent_id: null,
    is_deleted: false,
  } satisfies Prisma.community_commentsWhereInput;
  // For 'best' and 'new' sorting, use Prisma orderBy directly
  // For 'controversial', we need to compute and sort in application
  let comments: CommunityCommentAtSummaryTransformer.Payload[];
  let total: number;
  if (sort === "controversial") {
    // Fetch all non-deleted top-level comments to compute controversy score
    const allComments = await MyGlobal.prisma.community_comments.findMany({
      where: whereClause,
      ...CommunityCommentAtSummaryTransformer.select(),
    });
    // Sort by controversy score: (upvote_count + downvote_count) / (ABS(vote_score) + 1)
    const sorted = allComments.sort((a, b) => {
      const scoreA =
        (a.upvote_count + a.downvote_count) / (Math.abs(a.vote_score) + 1);
      const scoreB =
        (b.upvote_count + b.downvote_count) / (Math.abs(b.vote_score) + 1);
      return scoreB - scoreA; // Higher score first
    });
    total = sorted.length;
    comments = sorted.slice(skip, skip + limit);
  } else {
    // Build order by for 'best' and 'new'
    const orderByInput =
      sort === "best"
        ? [{ vote_score: "desc" as const }, { created_at: "asc" as const }]
        : [{ created_at: "desc" as const }];
    comments = await MyGlobal.prisma.community_comments.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityCommentAtSummaryTransformer.select(),
    });
    total = await MyGlobal.prisma.community_comments.count({
      where: whereClause,
    });
  }
  // Transform results
  const data = await ArrayUtil.asyncMap(
    comments,
    CommunityCommentAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit) || 0,
    } satisfies IPage.IPagination,
  };
}
