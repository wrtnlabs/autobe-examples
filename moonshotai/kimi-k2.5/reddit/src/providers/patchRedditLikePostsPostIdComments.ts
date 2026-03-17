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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikePostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IRequest;
}): Promise<IPageIRedditLikeComment.ISummary> {
  // Validate post exists
  await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput = {
    reddit_like_post_id: props.postId,
    ...(props.body.authorId !== null && {
      reddit_like_member_id: props.body.authorId,
    }),
    ...(props.body.parentId !== null
      ? { parent_id: props.body.parentId }
      : { parent_id: null }),
    ...(props.body.includeDeleted === false && { is_deleted: false }),
    ...(props.body.search !== null && {
      content: { contains: props.body.search, mode: "insensitive" as const },
    }),
  };
  // Build orderBy based on sort strategy
  let orderByInput: Prisma.reddit_like_commentsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "NEW":
      orderByInput = { created_at: "desc" };
      break;
    case "OLD":
      orderByInput = { created_at: "asc" };
      break;
    case "TOP":
      orderByInput = { vote_score: "desc" };
      break;
    case "CONTROVERSIAL":
      orderByInput = { vote_score: "asc" };
      break;
    case "BEST":
    case "QA":
    default:
      orderByInput = { vote_score: "desc" };
      break;
  }
  // Fetch comments with pagination
  const comments = await MyGlobal.prisma.reddit_like_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      content: true,
      vote_score: true,
      is_edited: true,
      is_deleted: true,
      created_at: true,
      parent_id: true,
      author: {
        select: {
          id: true,
          email: true,
          username: true,
          email_verified: true,
          created_at: true,
        },
      } satisfies Prisma.reddit_like_membersFindManyArgs,
      replies: {
        select: { id: true },
      } satisfies Prisma.reddit_like_commentsFindManyArgs,
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_like_comments.count({
    where: whereInput,
  });
  // Transform results manually since we need reply_count
  const transformedData: IRedditLikeComment.ISummary[] =
    await ArrayUtil.asyncMap(comments, async (comment) => ({
      id: comment.id as string & tags.Format<"uuid">,
      content: comment.is_deleted ? "[deleted]" : comment.content,
      author: {
        id: comment.author.id as string & tags.Format<"uuid">,
        email: comment.author.email as string & tags.Format<"email">,
        username: comment.author.username,
        emailVerified: comment.author.email_verified,
        createdAt: toISOStringSafe(comment.author.created_at) as string &
          tags.Format<"date-time">,
      } satisfies IRedditLikeMember.ISummary,
      vote_score: comment.vote_score as number & tags.Type<"int32">,
      is_edited: comment.is_edited,
      is_deleted: comment.is_deleted,
      created_at: toISOStringSafe(comment.created_at) as string &
        tags.Format<"date-time">,
      parent_id: comment.parent_id as (string & tags.Format<"uuid">) | null,
      reply_count: comment.replies.length as number & tags.Type<"int32">,
    }));
  return {
    data: transformedData,
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    } satisfies IPage.IPagination,
  };
}
