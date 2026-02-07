import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformPostsPostIdComments(props: {
  postId: string;
  body: IRedditPlatformComment.IRequest;
}): Promise<IPageIRedditPlatformComment.ISummary> {
  const page = 1; // Use default since props.body.page doesn't exist
  const limit = 100; // Use default since props.body.limit doesn't exist
  const skip = (page - 1) * limit;
  // Determine sort order (default to newest)
  const orderBy: Prisma.reddit_platform_commentsOrderByWithRelationInput = {
    created_at: "desc",
  };
  // Query for comments on this post
  const data = await MyGlobal.prisma.reddit_platform_comments.findMany({
    where: {
      post_id: props.postId,
      deleted_at: null,
    },
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      content: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      updated_at: true,
      parent_comment_id: true,
      author: {
        select: {
          id: true,
          username: true,
          avatar_url: true,
        },
      },
    },
  });
  // Count total matching comments
  const total = await MyGlobal.prisma.reddit_platform_comments.count({
    where: {
      post_id: props.postId,
      deleted_at: null,
    },
  });
  // Transform database records to summary DTO
  const summaryData = data.map((comment) => ({
    id: comment.id as string & tags.Format<"uuid">,
    content: comment.content,
    vote_score: comment.vote_score,
    comment_count: comment.comment_count,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: comment.updated_at ? toISOStringSafe(comment.updated_at) : null,
    parent_comment_id: comment.parent_comment_id,
    author: {
      id: comment.author.id as string & tags.Format<"uuid">,
      username: comment.author.username,
      avatar_url: comment.author.avatar_url || null,
    },
  }));
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
