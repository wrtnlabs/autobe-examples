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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeCommentAtSummaryTransformer } from "../transformers/RedditLikeCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberPostsPostIdCommentsSorted(props: {
  member: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IRequest;
}): Promise<IPageIRedditLikeComment.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput = {
    post_id: props.postId,
    ...(props.body.includeDeleted ? {} : { is_deleted: false }),
    ...(props.body.authorId ? { author_id: props.body.authorId } : {}),
    ...(props.body.parentId !== undefined
      ? { parent_id: props.body.parentId }
      : {}),
    ...(props.body.search
      ? {
          content: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        }
      : {}),
  } satisfies Prisma.reddit_like_commentsWhereInput;
  // Determine orderBy based on sort strategy
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
  // Query comments with pagination
  const comments = await MyGlobal.prisma.reddit_like_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...RedditLikeCommentAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_like_comments.count({
    where: whereInput,
  });
  // Transform to DTOs
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
