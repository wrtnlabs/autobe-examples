import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommentAtSummaryTransformer } from "../transformers/RedditLikeCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikePostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IRequest;
}): Promise<IPageIRedditLikeComment.ISummary> {
  // Verify post exists
  await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build where clause
  const where: Prisma.reddit_like_commentsWhereInput = {
    post_id: props.postId,
    ...(props.body.includeDeleted === false && { is_deleted: false }),
    ...(props.body.authorId !== null && { author_id: props.body.authorId }),
    ...(props.body.parentId !== undefined && {
      parent_id: props.body.parentId,
    }),
    ...(props.body.search !== null && {
      content: { contains: props.body.search, mode: "insensitive" },
    }),
  };
  // Build orderBy based on sort
  let orderBy:
    | Prisma.reddit_like_commentsOrderByWithRelationInput
    | Prisma.reddit_like_commentsOrderByWithRelationInput[];
  switch (props.body.sort) {
    case "BEST":
      orderBy = { vote_score: "desc" };
      break;
    case "NEW":
      orderBy = { created_at: "desc" };
      break;
    case "CONTROVERSIAL":
      orderBy = { vote_score: "asc" };
      break;
    case "TOP":
      orderBy = { vote_score: "desc" };
      break;
    case "OLD":
      orderBy = { created_at: "asc" };
      break;
    case "QA":
      orderBy = [{ parent_id: "asc" }, { created_at: "asc" }];
      break;
    default:
      orderBy = { created_at: "desc" };
  }
  // Query paginated comments
  const comments = await MyGlobal.prisma.reddit_like_comments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...RedditLikeCommentAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.reddit_like_comments.count({ where });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    comments,
    RedditLikeCommentAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
