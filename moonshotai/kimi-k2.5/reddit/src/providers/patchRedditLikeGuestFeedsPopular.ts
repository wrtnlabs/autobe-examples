import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditLikePostAtSummaryTransformer } from "../transformers/RedditLikePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeGuestFeedsPopular(props: {
  guest: GuestPayload;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "hot";
  // Build where clause with proper typing
  const where = {
    is_deleted: false,
    ...(props.body.communityId && { community_id: props.body.communityId }),
    ...(props.body.authorId && { author_id: props.body.authorId }),
    ...(props.body.postType && { post_type: props.body.postType }),
    ...(props.body.search && {
      title: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.timeFilter &&
      props.body.timeFilter !== "all_time" && {
        created_at: {
          gte: ((): Date => {
            const periods: Record<string, number> = {
              today: 24 * 60 * 60 * 1000,
              week: 7 * 24 * 60 * 60 * 1000,
              month: 30 * 24 * 60 * 60 * 1000,
              year: 365 * 24 * 60 * 60 * 1000,
            };
            const ms = periods[props.body.timeFilter!] ?? 0;
            return new Date(Date.now() - ms);
          })(),
        },
      }),
    ...((props.body.createdAfter || props.body.createdBefore) && {
      created_at: {
        ...(props.body.createdAfter && {
          gte: new Date(props.body.createdAfter),
        }),
        ...(props.body.createdBefore && {
          lte: new Date(props.body.createdBefore),
        }),
      },
    }),
  } satisfies Prisma.reddit_like_postsWhereInput;
  // Build orderBy based on sort strategy
  const orderBy = (
    props.body.sortBy && props.body.sortOrder
      ? { [props.body.sortBy]: props.body.sortOrder }
      : sort === "new"
        ? { created_at: "desc" as const }
        : sort === "top"
          ? { vote_score: "desc" as const }
          : { vote_score: "desc" as const }
  ) satisfies Prisma.reddit_like_postsOrderByWithRelationInput;
  // Execute query with pagination
  const posts = await MyGlobal.prisma.reddit_like_posts.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...RedditLikePostAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_like_posts.count({ where });
  // Transform posts to summary format
  const data = await ArrayUtil.asyncMap(
    posts,
    RedditLikePostAtSummaryTransformer.transform,
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
