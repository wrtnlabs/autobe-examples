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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeGuestPostsPostIdCommentsSorted(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IRequest;
}): Promise<IPageIRedditLikeComment.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereInput: Prisma.reddit_like_commentsWhereInput = {
    post: { id: props.postId },
    ...(props.body.includeDeleted ? {} : { deleted_at: null }),
    ...(props.body.authorId !== null && {
      author: { id: props.body.authorId },
    }),
    ...(props.body.parentId !== null
      ? { parent: { id: props.body.parentId } }
      : { parent_id: null }),
    ...(props.body.search !== null && {
      content: { contains: props.body.search, mode: "insensitive" as const },
    }),
  };
  // Determine orderBy based on sort type
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
    case "QA":
      orderByInput = { created_at: "asc" };
      break;
    case "BEST":
    default:
      orderByInput = { vote_score: "desc" };
      break;
  }
  // Fetch comments with author info
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
      },
    },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_like_comments.count({
    where: whereInput,
  });
  // Calculate reply counts for each comment
  const commentIds = comments.map((c) => c.id);
  const replyCounts = await MyGlobal.prisma.reddit_like_comments.groupBy({
    by: ["parent_id"],
    where: { parent_id: { in: commentIds } },
    _count: { parent_id: true },
  });
  const replyCountMap = new Map<string, number>();
  for (const rc of replyCounts) {
    if (rc.parent_id !== null) {
      replyCountMap.set(rc.parent_id, rc._count.parent_id);
    }
  }
  // Transform to response format using transformer pattern
  const data: IRedditLikeComment.ISummary[] = await ArrayUtil.asyncMap(
    comments,
    async (comment) => {
      const authorSummary: IRedditLikeMember.ISummary = {
        id: comment.author.id,
        email: comment.author.email,
        username: comment.author.username,
        emailVerified: comment.author.email_verified,
        createdAt: toISOStringSafe(comment.author.created_at),
      };
      return {
        id: comment.id,
        content: comment.content,
        author: authorSummary,
        vote_score: comment.vote_score,
        is_edited: comment.is_edited,
        is_deleted: comment.is_deleted,
        created_at: toISOStringSafe(comment.created_at),
        parent_id: comment.parent_id,
        reply_count: (replyCountMap.get(comment.id) ??
          0) satisfies number as number & tags.Type<"int32"> & tags.Minimum<0>,
      };
    },
  );
  return {
    data,
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
