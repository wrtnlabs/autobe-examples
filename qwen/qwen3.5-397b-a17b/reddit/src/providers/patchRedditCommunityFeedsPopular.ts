import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityFeedsPopular(props: {
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 && props.body.limit <= 100
      ? props.body.limit
      : 100;
  const skip = (page - 1) * limit;
  const timeRangeStart =
    props.body.timeRange && props.body.sort === "top"
      ? getTimeRangeStart(props.body.timeRange)
      : undefined;
  const whereInput = {
    deleted_at: null,
    ...(props.body.communityId && {
      reddit_community_community_id: props.body.communityId,
    }),
    ...(props.body.authorId && {
      reddit_community_member_id: props.body.authorId,
    }),
    ...(props.body.postType && { post_type: props.body.postType }),
    ...(timeRangeStart && {
      created_at: {
        gte: timeRangeStart,
      },
    }),
  } satisfies Prisma.reddit_community_postsWhereInput;
  const orderByInput = getOrderByClause(
    props.body.sort,
  ) satisfies Prisma.reddit_community_postsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityPostAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityPost.ISummary;
}
function getTimeRangeStart(
  timeRange: string,
): string & tags.Format<"date-time"> {
  const now = new Date();
  const iso = toISOStringSafe(now);
  switch (timeRange) {
    case "today": {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      return toISOStringSafe(start);
    }
    case "thisWeek": {
      const dayOfWeek = now.getUTCDay();
      const diff = now.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff),
      );
      return toISOStringSafe(start);
    }
    case "thisMonth": {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      return toISOStringSafe(start);
    }
    case "thisYear": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      return toISOStringSafe(start);
    }
    case "allTime":
    default: {
      const start = new Date(0);
      return toISOStringSafe(start);
    }
  }
}
function getOrderByClause(
  sort?: string,
): Prisma.reddit_community_postsOrderByWithRelationInput {
  switch (sort) {
    case "new":
      return { created_at: "desc" };
    case "top":
      return { created_at: "desc" };
    case "controversial":
      return { created_at: "desc" };
    case "hot":
    default:
      return { created_at: "desc" };
  }
}
