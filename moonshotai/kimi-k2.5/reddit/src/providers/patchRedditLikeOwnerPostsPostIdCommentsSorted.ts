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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    post_id: props.postId,
    ...(props.body.parentId !== null
      ? { parent_id: props.body.parentId }
      : { parent_id: null }),
    ...(props.body.authorId !== null && { author_id: props.body.authorId }),
    ...(!props.body.includeDeleted && { is_deleted: false }),
    ...(props.body.search !== null &&
      props.body.search.length > 0 && {
        content: { contains: props.body.search, mode: "insensitive" },
      }),
  } satisfies Prisma.reddit_like_commentsWhereInput;
  const orderByInput:
    | Prisma.reddit_like_commentsOrderByWithRelationInput
    | Prisma.reddit_like_commentsOrderByWithRelationInput[] =
    props.body.sort === "BEST"
      ? [
          { vote_score: "desc" as Prisma.SortOrder },
          { created_at: "desc" as Prisma.SortOrder },
        ]
      : props.body.sort === "TOP"
        ? { vote_score: "desc" as Prisma.SortOrder }
        : props.body.sort === "NEW"
          ? { created_at: "desc" as Prisma.SortOrder }
          : props.body.sort === "OLD"
            ? { created_at: "asc" as Prisma.SortOrder }
            : props.body.sort === "CONTROVERSIAL"
              ? [
                  { vote_score: "asc" as Prisma.SortOrder },
                  { created_at: "desc" as Prisma.SortOrder },
                ]
              : props.body.sort === "QA"
                ? [
                    {
                      parent_id: {
                        sort: "asc" as Prisma.SortOrder,
                        nulls: "first" as Prisma.NullsOrder,
                      },
                    },
                    { created_at: "asc" as Prisma.SortOrder },
                  ]
                : { created_at: "desc" as Prisma.SortOrder };
  const rawData = await MyGlobal.prisma.reddit_like_comments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditLikeCommentAtSummaryTransformer.select(),
  });
  const data = rawData as Parameters<
    typeof RedditLikeCommentAtSummaryTransformer.transform
  >[0][];
  const total = await MyGlobal.prisma.reddit_like_comments.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditLikeCommentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
