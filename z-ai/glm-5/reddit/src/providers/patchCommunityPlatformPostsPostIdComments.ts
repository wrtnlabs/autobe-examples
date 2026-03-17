import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentAtSummaryTransformer } from "../transformers/CommunityPlatformCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const sort = props.body.sort ?? "best";
  const skip = (page - 1) * limit;
  // Verify post exists
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  // Build where clause for top-level comments only
  // Nested replies are fetched recursively by the transformer
  const where = {
    community_platform_post_id: props.postId,
    deleted_at: null,
    parent_comment_id: null,
  } satisfies Prisma.community_platform_commentsWhereInput;
  // Build orderBy based on sort type:
  // - 'best': highest vote score first
  // - 'new': most recent first
  // - 'controversial': comments with vote score near zero (divided opinions)
  //   Note: Proper controversy scoring requires upvote/downvote counts which would
  //   need aggregation from votes table. Using proximity to zero as approximation.
  const orderBy = (
    sort === "new"
      ? [{ created_at: "desc" as const }]
      : sort === "controversial"
        ? [{ vote_score: "asc" as const }, { created_at: "desc" as const }]
        : [{ vote_score: "desc" as const }, { created_at: "desc" as const }]
  ) satisfies Prisma.community_platform_commentsOrderByWithRelationInput[];
  // Fetch paginated top-level comments with nested replies
  const comments = await MyGlobal.prisma.community_platform_comments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...CommunityPlatformCommentAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.community_platform_comments.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      comments,
      CommunityPlatformCommentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
