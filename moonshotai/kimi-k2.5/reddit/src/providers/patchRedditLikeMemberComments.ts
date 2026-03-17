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

export async function patchRedditLikeMemberComments(props: {
  member: AdminPayload;
  body: IRedditLikeComment.IRequest;
}): Promise<IPageIRedditLikeComment.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build where clause based on filters
  const where = {
    ...(props.body.includeDeleted === false && { is_deleted: false }),
    ...(props.body.authorId !== null && { author_id: props.body.authorId }),
    ...(props.body.parentId !== null
      ? { parent_id: props.body.parentId }
      : { parent_id: null }),
    ...(props.body.search !== null && {
      content: { contains: props.body.search, mode: "insensitive" as const },
    }),
  } satisfies Prisma.reddit_like_commentsWhereInput;
  // Determine orderBy based on sort parameter
  const orderBy = (
    props.body.sort === "BEST"
      ? { vote_score: "desc" as const }
      : props.body.sort === "NEW"
        ? { created_at: "desc" as const }
        : props.body.sort === "CONTROVERSIAL"
          ? { vote_score: "asc" as const }
          : props.body.sort === "TOP"
            ? { vote_score: "desc" as const }
            : props.body.sort === "OLD"
              ? { created_at: "asc" as const }
              : props.body.sort === "QA"
                ? [
                    { parent_id: "asc" as const },
                    { created_at: "asc" as const },
                  ]
                : { created_at: "desc" as const }
  ) as Prisma.reddit_like_commentsOrderByWithRelationInput;
  // Query comments with pagination
  const comments = await MyGlobal.prisma.reddit_like_comments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...RedditLikeCommentAtSummaryTransformer.select(),
  });
  // Count total matching records
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
