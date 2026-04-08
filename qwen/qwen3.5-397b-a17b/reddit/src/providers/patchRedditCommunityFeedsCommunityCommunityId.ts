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

export async function patchRedditCommunityFeedsCommunityCommunityId(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const timeRangeStart =
    props.body.sort === "top" && props.body.timeRange
      ? getTimeRangeStart(props.body.timeRange)
      : undefined;
  const whereInput = {
    reddit_community_community_id: props.communityId,
    deleted_at: null,
    ...(timeRangeStart && {
      created_at: {
        gte: timeRangeStart,
      },
    }),
  } satisfies Prisma.reddit_community_postsWhereInput;
  const orderByInput = getOrderByClause(
    props.body.sort,
  ) satisfies Prisma.reddit_community_postsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
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
      records,
      RedditCommunityPostAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityPost.ISummary;
}
function getTimeRangeStart(
  timeRange: "today" | "thisWeek" | "thisMonth" | "thisYear" | "allTime",
): string & tags.Format<"date-time"> {
  const now = new Date();
  let start: Date;
  switch (timeRange) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "thisWeek": {
      const dayOfWeek = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "thisMonth":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "thisYear":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case "allTime":
      return toISOStringSafe(new Date(0));
  }
  return toISOStringSafe(start);
}
function getOrderByClause(
  sort?: "hot" | "new" | "top" | "controversial",
): Prisma.reddit_community_postsOrderByWithRelationInput {
  switch (sort) {
    case "new":
      return { created_at: "desc" };
    case "top":
      return { created_at: "desc" };
    case "hot":
    case "controversial":
    default:
      return { created_at: "desc" };
  }
}
