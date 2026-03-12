import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommentAtSummaryTransformer } from "../transformers/RedditCloneCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditClonePostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IRequest;
}): Promise<IPageIRedditCloneComment.ISummary> {
  // Verify post exists
  await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  // Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.reddit_clone_commentsWhereInput = {
    reddit_clone_post_id: props.postId,
    deleted_at: null,
    ...(props.body.search && {
      content: {
        contains: props.body.search,
      },
    }),
    ...(props.body.authorId && {
      reddit_clone_member_id: props.body.authorId,
    }),
  };
  // Build ORDER BY clause
  const orderByInput: Prisma.reddit_clone_commentsOrderByWithRelationInput =
    props.body.sort === "score"
      ? { score: "desc" as const }
      : props.body.sort === "updated_at"
        ? { updated_at: (props.body.order ?? "desc") as "asc" | "desc" }
        : { created_at: (props.body.order ?? "desc") as "asc" | "desc" };
  // Fetch comments with transformer select
  const data = await MyGlobal.prisma.reddit_clone_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneCommentAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_clone_comments.count({
    where: whereInput,
  });
  // Transform comments
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCloneCommentAtSummaryTransformer.transform,
  );
  // Build pagination metadata
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditCloneComment.ISummary;
}
