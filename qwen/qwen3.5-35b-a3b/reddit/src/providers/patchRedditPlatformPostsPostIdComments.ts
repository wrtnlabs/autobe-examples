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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformComment.IRequest;
}): Promise<IPageIRedditPlatformComment.ISummary> {
  // Validate post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      reddit_platform_community_id: true,
    },
  });
  // Get pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build sort order
  let orderByInput:
    | Prisma.reddit_platform_commentsOrderByWithRelationInput
    | Prisma.reddit_platform_commentsOrderByWithRelationInput[];
  if (props.body.sortType === "BEST") {
    orderByInput = { vote_score: "desc" as const, created_at: "desc" as const };
  } else if (props.body.sortType === "NEW") {
    orderByInput = { created_at: "desc" as const };
  } else if (props.body.sortType === "CONTROVERSIAL") {
    // Fetch with basic sort, then sort client-side for CONTROVERSIAL
    orderByInput = { vote_score: "asc" as const, created_at: "desc" as const };
  } else {
    orderByInput = { vote_score: "desc" as const, created_at: "desc" as const };
  }
  // Build where clause
  const whereInput = {
    post_id: props.postId,
    deleted_at: null,
    ...(props.body.search && {
      content: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.authorId && { author_id: props.body.authorId }),
  } satisfies Prisma.reddit_platform_commentsWhereInput;
  // Fetch comments with author info
  const data = await MyGlobal.prisma.reddit_platform_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      vote_score: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_url: true,
          karma_score: true,
          created_at: true,
        },
      },
    },
  });
  // Fetch total count
  const total = await MyGlobal.prisma.reddit_platform_comments.count({
    where: whereInput,
  });
  // For CONTROVERSIAL sort, we need to compute absolute score and sort
  const finalData =
    props.body.sortType === "CONTROVERSIAL"
      ? data.sort((a, b) => {
          const absA = Math.abs(a.vote_score);
          const absB = Math.abs(b.vote_score);
          if (absA !== absB) return absB - absA;
          return a.created_at.getTime() - b.created_at.getTime();
        })
      : data;
  // Slice to page boundary after sorting
  const slicedData = finalData.slice(skip, skip + limit);
  // Transform results
  const transformed = slicedData.map((comment) => {
    const author = comment.author;
    const memberSummary: IRedditPlatformMember.ISummary = {
      id: author.id,
      username: author.username,
      displayName: author.display_name,
      bio: author.bio,
      avatarUrl: author.avatar_url,
      karmaScore: author.karma_score,
      createdAt: toISOStringSafe(author.created_at),
      subscriptionCount: 0,
    };
    return {
      id: comment.id,
      vote_score: comment.vote_score,
      author: memberSummary,
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
      deleted_at: comment.deleted_at
        ? toISOStringSafe(comment.deleted_at)
        : null,
    } satisfies IRedditPlatformComment.ISummary;
  });
  // Recalculate pagination after slicing
  const actualRecords = slicedData.length;
  const currentPage = page;
  const actualPages = Math.ceil(total / limit);
  return {
    data: transformed,
    pagination: {
      current: currentPage,
      limit: limit,
      records: total,
      pages: actualPages,
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditPlatformComment.ISummary;
}
