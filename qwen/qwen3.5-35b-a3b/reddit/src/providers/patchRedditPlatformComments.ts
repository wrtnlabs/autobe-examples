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
import { RedditPlatformMemberAtSummaryTransformer } from "../transformers/RedditPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformComments(props: {
  body: IRedditPlatformComment.IRequest;
}): Promise<IPageIRedditPlatformComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sortType = props.body.sortType ?? "BEST";
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput: Prisma.reddit_platform_commentsWhereInput = {
    deleted_at: props.body.status === "deleted" ? undefined : null,
    ...(props.body.authorId !== undefined && {
      author_id: props.body.authorId,
    }),
    ...(props.body.search !== undefined && {
      content: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.communityName !== undefined && {
      post: {
        community: {
          name: props.body.communityName,
        },
      },
    }),
  } satisfies Prisma.reddit_platform_commentsWhereInput;
  // Build ORDER BY based on sortType
  const orderByInput =
    sortType === "BEST"
      ? [
          { vote_score: "desc" as Prisma.SortOrder },
          { created_at: "desc" as Prisma.SortOrder },
        ]
      : sortType === "NEW"
        ? [{ created_at: "desc" as Prisma.SortOrder }]
        : [{ vote_score: "asc" as Prisma.SortOrder }];
  const orderByWithSearch: Prisma.reddit_platform_commentsOrderByWithRelationInput[] =
    sortType === "CONTROVERSIAL"
      ? [{ vote_score: "asc" as Prisma.SortOrder }]
      : orderByInput;
  // Fetch paginated results
  const data = await MyGlobal.prisma.reddit_platform_comments.findMany({
    where: whereInput,
    orderBy: orderByWithSearch,
    skip,
    take: limit,
    include: {
      author: RedditPlatformMemberAtSummaryTransformer.select(),
    },
  });
  // Fetch total count
  const total = await MyGlobal.prisma.reddit_platform_comments.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(data, async (comment) => {
    return {
      id: comment.id,
      vote_score: comment.vote_score,
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        comment.author,
      ),
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
      deleted_at: comment.deleted_at
        ? toISOStringSafe(comment.deleted_at)
        : null,
    };
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
