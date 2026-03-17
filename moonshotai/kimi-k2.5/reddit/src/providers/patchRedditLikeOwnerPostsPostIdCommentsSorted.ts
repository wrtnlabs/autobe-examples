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
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditLikeCommentAtSummaryTransformer } from "../transformers/RedditLikeCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeOwnerPostsPostIdCommentsSorted(props: {
  owner: OwnerPayload;
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
  // Build where clause with proper type safety
  const where = {
    post_id: props.postId,
    ...(props.body.search && {
      content: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(props.body.authorId && {
      author_id: props.body.authorId,
    }),
    ...(props.body.parentId !== undefined && {
      parent_id: props.body.parentId,
    }),
    ...(props.body.includeDeleted === false && {
      is_deleted: false,
    }),
  } satisfies Prisma.reddit_like_commentsWhereInput;
  // Build orderBy based on sort strategy
  const orderBy: Prisma.reddit_like_commentsOrderByWithRelationInput[] =
    (() => {
      switch (props.body.sort) {
        case "BEST":
          return [{ vote_score: "desc" }, { created_at: "desc" }];
        case "NEW":
          return [{ created_at: "desc" }];
        case "CONTROVERSIAL":
          return [{ vote_score: "asc" }, { created_at: "desc" }];
        case "TOP":
          return [{ vote_score: "desc" }];
        case "OLD":
          return [{ created_at: "asc" }];
        case "QA":
          return [{ parent_id: "asc" }, { created_at: "asc" }];
        default:
          return [{ created_at: "desc" }];
      }
    })();
  // Execute queries sequentially for proper typing
  const comments = await MyGlobal.prisma.reddit_like_comments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...RedditLikeCommentAtSummaryTransformer.select(),
  });
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
