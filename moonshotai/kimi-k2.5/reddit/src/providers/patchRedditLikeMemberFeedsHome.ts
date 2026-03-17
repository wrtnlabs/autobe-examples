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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikePostAtSummaryTransformer } from "../transformers/RedditLikePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberFeedsHome(props: {
  member: AdminPayload;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  // Get member's subscribed community IDs
  const subscriptions =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findMany({
      where: {
        reddit_like_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        reddit_like_community_id: true,
      },
    });
  const subscribedCommunityIds = subscriptions.map(
    (s) => s.reddit_like_community_id,
  );
  // If no subscriptions, return empty page
  if (subscribedCommunityIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: props.body.page ?? 1,
        limit: props.body.limit ?? 20,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Determine which communities to filter by
  // If specific communityId requested, ensure it's in subscribed list
  const communityIdsToFilter =
    props.body.communityId !== undefined
      ? subscribedCommunityIds.includes(props.body.communityId)
        ? [props.body.communityId]
        : [] // Requested community not subscribed, will return empty
      : subscribedCommunityIds;
  // If filtered list is empty (requested unsubscribed community), return empty
  if (communityIdsToFilter.length === 0) {
    return {
      data: [],
      pagination: {
        current: props.body.page ?? 1,
        limit: props.body.limit ?? 20,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Calculate time filter date if applicable
  const timeFilterDate: string | undefined = (() => {
    if (
      props.body.timeFilter === undefined ||
      props.body.timeFilter === "all_time"
    ) {
      return undefined;
    }
    const now = new Date();
    const offsetMap = {
      today: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    };
    return new Date(
      now.getTime() - offsetMap[props.body.timeFilter],
    ).toISOString();
  })();
  // Build created_at filter combining timeFilter and explicit date bounds
  const createdAtFilter: Prisma.DateTimeFilter | undefined = (() => {
    const filters: Prisma.DateTimeFilter = {};
    if (timeFilterDate !== undefined) {
      filters.gte = new Date(timeFilterDate);
    }
    if (props.body.createdAfter !== undefined) {
      const afterDate = new Date(props.body.createdAfter);
      if (filters.gte === undefined || afterDate > filters.gte) {
        filters.gte = afterDate;
      }
    }
    if (props.body.createdBefore !== undefined) {
      filters.lte = new Date(props.body.createdBefore);
    }
    return Object.keys(filters).length > 0 ? filters : undefined;
  })();
  // Build where clause
  const whereInput: Prisma.reddit_like_postsWhereInput = {
    is_deleted: false,
    community_id: {
      in: communityIdsToFilter,
    },
    ...(props.body.authorId !== undefined && {
      author_id: props.body.authorId,
    }),
    ...(props.body.postType !== undefined && {
      post_type: props.body.postType,
    }),
    ...(props.body.search !== undefined && {
      title: {
        contains: props.body.search,
      },
    }),
    ...(createdAtFilter !== undefined && {
      created_at: createdAtFilter,
    }),
  };
  // Determine sort order
  const orderBy: Prisma.reddit_like_postsOrderByWithRelationInput = (() => {
    const sort = props.body.sort;
    const sortBy = props.body.sortBy;
    const sortOrder = props.body.sortOrder ?? "desc";
    if (sort === "new") {
      return { created_at: "desc" };
    }
    if (sort === "top") {
      return { vote_score: "desc" };
    }
    if (sort === "hot") {
      return { vote_score: "desc" };
    }
    if (sort === "controversial") {
      return { comment_count: "desc" };
    }
    if (sortBy === "created_at") {
      return { created_at: sortOrder };
    }
    if (sortBy === "vote_score") {
      return { vote_score: sortOrder };
    }
    if (sortBy === "comment_count") {
      return { comment_count: sortOrder };
    }
    return { created_at: "desc" };
  })();
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query posts with pagination
  const posts = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: whereInput,
    orderBy,
    skip,
    take: limit,
    ...RedditLikePostAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.reddit_like_posts.count({
    where: whereInput,
  });
  // Transform results
  const transformedPosts = await ArrayUtil.asyncMap(
    posts,
    RedditLikePostAtSummaryTransformer.transform,
  );
  return {
    data: transformedPosts,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
