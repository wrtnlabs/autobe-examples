import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommentAtSummaryTransformer } from "../transformers/RedditPlatformCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformComment.IRequest;
}): Promise<IPageIRedditPlatformComment.ISummary> {
  // Verify post exists and is not deleted
  await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: { id: props.postId, deleted_at: null },
  });
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.reddit_platform_commentsWhereInput = {
    reddit_platform_post_id: props.postId,
    deleted_at: null,
    ...(props.body.parent_comment_id !== undefined && {
      parent_comment_id: props.body.parent_comment_id,
    }),
  } satisfies Prisma.reddit_platform_commentsWhereInput;
  // Build orderBy based on sort parameter
  // Note: Vote score ordering requires aggregation, so we order by vote count as proxy
  const orderByInput =
    props.body.sort === "new"
      ? { created_at: "desc" as const }
      : { votes: { _count: "desc" as const } };
  // Fetch paginated comments with vote data
  const comments = await MyGlobal.prisma.reddit_platform_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditPlatformCommentAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.reddit_platform_comments.count({
    where: whereInput,
  });
  // Transform comments to response DTO
  const data = await Promise.all(
    comments.map((comment) =>
      RedditPlatformCommentAtSummaryTransformer.transform(comment),
    ),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditPlatformComment.ISummary;
}
