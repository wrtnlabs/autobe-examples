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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeCommentAtSummaryTransformer } from "../transformers/RedditLikeCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeModeratorPostsPostIdCommentsSorted(props: {
  moderator: ModeratorPayload;
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
    ...(props.body.search !== null && {
      content: { contains: props.body.search },
    }),
    ...(props.body.authorId !== null && {
      author_id: props.body.authorId,
    }),
    ...(props.body.parentId !== null
      ? { parent_id: props.body.parentId }
      : { parent_id: null }),
    ...(props.body.includeDeleted === false && {
      is_deleted: false,
    }),
  };
  // Build orderBy based on sort type
  let orderBy: Prisma.reddit_like_commentsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "BEST":
      orderBy = { vote_score: "desc" };
      break;
    case "TOP":
      orderBy = { vote_score: "desc" };
      break;
    case "NEW":
      orderBy = { created_at: "desc" };
      break;
    case "OLD":
      orderBy = { created_at: "asc" };
      break;
    case "CONTROVERSIAL":
      // High activity with mixed votes - order by absolute vote_score ascending
      // Comments with scores close to 0 but with activity appear first
      orderBy = { vote_score: "asc" };
      break;
    case "QA":
      // Threaded view: order by created_at for chronological threading
      orderBy = { created_at: "asc" };
      break;
    default:
      orderBy = { created_at: "desc" };
  }
  // Fetch comments with pagination
  const comments = await MyGlobal.prisma.reddit_like_comments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...RedditLikeCommentAtSummaryTransformer.select(),
  });
  // Get total count
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
