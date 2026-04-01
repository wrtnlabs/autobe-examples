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
  // Verify post exists and get its community
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, community_id: true },
  });
  // Verify moderator has permission for this community
  const moderatorRole = await MyGlobal.prisma.reddit_like_moderators.findFirst({
    where: {
      member_id: props.moderator.id,
      community_id: post.community_id,
      deleted_at: null,
    },
  });
  if (moderatorRole === null) {
    throw new HttpException(
      "Forbidden - not a moderator for this community",
      403,
    );
  }
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.reddit_like_commentsWhereInput = {
    post_id: props.postId,
    ...(props.body.includeDeleted !== true && { is_deleted: false }),
    ...(props.body.parentId !== null && { parent_id: props.body.parentId }),
    ...(props.body.parentId === null && { parent_id: null }),
    ...(props.body.authorId !== null && { author_id: props.body.authorId }),
    ...(props.body.search !== null &&
      props.body.search.length > 0 && {
        content: {
          contains: props.body.search,
          mode: "insensitive" as Prisma.QueryMode,
        },
      }),
  };
  // Build orderBy based on sort type
  let orderBy:
    | Prisma.reddit_like_commentsOrderByWithRelationInput
    | Prisma.reddit_like_commentsOrderByWithRelationInput[];
  switch (props.body.sort) {
    case "BEST":
      orderBy = [{ vote_score: "desc" }, { created_at: "desc" }];
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
      // High activity with mixed votes - use abs(vote_score)接近0 with high total votes
      orderBy = [{ vote_score: "asc" }, { created_at: "desc" }];
      break;
    case "QA":
      // Threaded - order by parent then created_at for conversation flow
      orderBy = [{ parent_id: "asc" }, { created_at: "asc" }];
      break;
    default:
      orderBy = { created_at: "desc" };
  }
  // Fetch comments with pagination
  const comments = await MyGlobal.prisma.reddit_like_comments.findMany({
    where: whereInput,
    orderBy: orderBy,
    skip,
    take: limit,
    ...RedditLikeCommentAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_like_comments.count({
    where: whereInput,
  });
  // Transform to DTO
  const data = await ArrayUtil.asyncMap(
    comments,
    RedditLikeCommentAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
