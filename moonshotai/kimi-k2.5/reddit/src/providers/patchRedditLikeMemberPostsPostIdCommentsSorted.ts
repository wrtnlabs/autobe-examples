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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommentAtSummaryTransformer } from "../transformers/RedditLikeCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberPostsPostIdCommentsSorted(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IRequest;
}): Promise<IPageIRedditLikeComment.ISummary> {
  // Verify post exists
  await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  const { sort, page, limit, search, authorId, parentId, includeDeleted } =
    props.body;
  // Build where clause
  const whereInput: Prisma.reddit_like_commentsWhereInput = {
    post_id: props.postId,
    ...(authorId !== null && { author_id: authorId }),
    ...(parentId !== null ? { parent_id: parentId } : { parent_id: null }),
    ...(search !== null && {
      content: { contains: search, mode: "insensitive" },
    }),
    ...(includeDeleted !== true && { is_deleted: false }),
  } satisfies Prisma.reddit_like_commentsWhereInput;
  // Build order by based on sort type
  const orderByInput: Prisma.reddit_like_commentsOrderByWithRelationInput =
    sort === "BEST"
      ? { vote_score: "desc" }
      : sort === "NEW"
        ? { created_at: "desc" }
        : sort === "TOP"
          ? { vote_score: "desc" }
          : sort === "CONTROVERSIAL"
            ? { vote_score: "asc" }
            : sort === "OLD"
              ? { created_at: "asc" }
              : { created_at: "desc" };
  const skip = (page - 1) * limit;
  const comments = await MyGlobal.prisma.reddit_like_comments.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditLikeCommentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_comments.count({
    where: whereInput,
  });
  const transformed = await ArrayUtil.asyncMap(
    comments,
    RedditLikeCommentAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
