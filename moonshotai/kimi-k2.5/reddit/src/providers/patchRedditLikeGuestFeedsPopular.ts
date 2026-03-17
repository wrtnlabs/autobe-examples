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
  // Build where clause based on filters
  const whereInput = {
    is_deleted: false,
    ...(props.body.search && {
      title: {
        contains: props.body.search,
      },
    }),
    ...(props.body.communityId && {
      community_id: props.body.communityId,
    }),
    ...(props.body.authorId && {
      author_id: props.body.authorId,
    }),
    ...(props.body.postType && {
      post_type: props.body.postType,
    }),
    ...(props.body.createdAfter && {
      created_at: {
        gte: new Date(props.body.createdAfter),
      },
    }),
    ...(props.body.createdBefore && {
      created_at: {
        lte: new Date(props.body.createdBefore),
      },
    }),
    // Time filter for top/controversial sorting
    ...(props.body.timeFilter &&
      props.body.timeFilter !== "all_time" && {
        created_at: {
          gte: (() => {
            const now = new Date();
            switch (props.body.timeFilter) {
              case "today":
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
              case "week":
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              case "month":
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              case "year":
                return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
              default:
                return undefined;
            }
          })(),
        },
      }),
  } satisfies Prisma.reddit_like_postsWhereInput;
  // Build orderBy based on sort strategy
  const orderByInput = (() => {
    const sort = props.body.sort ?? "hot";
    const sortBy = props.body.sortBy;
    const sortOrder = props.body.sortOrder ?? "desc";
    if (sortBy) {
      // Custom sort by field
      return {
        [sortBy]: sortOrder,
      } satisfies Prisma.reddit_like_postsOrderByWithRelationInput;
    }
    switch (sort) {
      case "new":
        return {
          created_at: "desc",
        } satisfies Prisma.reddit_like_postsOrderByWithRelationInput;
      case "top":
        return {
          vote_score: "desc",
        } satisfies Prisma.reddit_like_postsOrderByWithRelationInput;
      case "controversial":
        // High engagement with near-zero score
        return {
          vote_score: "asc",
        } satisfies Prisma.reddit_like_postsOrderByWithRelationInput;
      case "hot":
      default:
        // Hot: combination of vote_score and recency
        // Use vote_score as primary, created_at as secondary
        return {
          vote_score: "desc",
          created_at: "desc",
        } satisfies Prisma.reddit_like_postsOrderByWithRelationInput;
    }
  })();
  // Fetch posts with pagination
  const posts = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditLikePostAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_like_posts.count({
    where: whereInput,
  });
  // Transform posts to DTOs
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
