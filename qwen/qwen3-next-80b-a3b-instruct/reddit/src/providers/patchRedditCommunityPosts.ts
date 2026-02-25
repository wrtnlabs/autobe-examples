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
import { RedditCommunityPostAtSumTransformer } from "../transformers/RedditCommunityPostAtSumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPosts(props: {
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISum> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1 || limit < 1 || limit > 100) {
    throw new HttpException("Invalid page or limit", 400);
  }
  const validSorts = ["new", "top", "hot", "controversial"] as const;
  if (!validSorts.includes(props.body.sort)) {
    throw new HttpException("Invalid sort type", 400);
  }
  const validTimeFilters = ["today", "week", "month", "year", "all"] as const;
  if (
    props.body.timeFilter &&
    !validTimeFilters.includes(props.body.timeFilter)
  ) {
    throw new HttpException("Invalid timeFilter", 400);
  }
  const skip = (page - 1) * limit;
  let whereInput: Prisma.reddit_community_postsWhereInput = {};
  if (props.body.timeFilter) {
    let timeFilterDate: string & tags.Format<"date-time">;
    const now = toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">;
    switch (props.body.timeFilter) {
      case "today":
        timeFilterDate = toISOStringSafe(
          new Date(new Date(now).getTime() - 24 * 60 * 60 * 1000),
        ) as string & tags.Format<"date-time">;
        break;
      case "week":
        timeFilterDate = toISOStringSafe(
          new Date(new Date(now).getTime() - 7 * 24 * 60 * 60 * 1000),
        ) as string & tags.Format<"date-time">;
        break;
      case "month":
        timeFilterDate = toISOStringSafe(
          new Date(new Date(now).getTime() - 30 * 24 * 60 * 60 * 1000),
        ) as string & tags.Format<"date-time">;
        break;
      case "year":
        timeFilterDate = toISOStringSafe(
          new Date(new Date(now).getTime() - 365 * 24 * 60 * 60 * 1000),
        ) as string & tags.Format<"date-time">;
        break;
      default:
        timeFilterDate = "1970-01-01T00:00:00.000Z" as string &
          tags.Format<"date-time">;
    }
    whereInput.created_at = { gte: timeFilterDate };
  }
  let orderByInput: Prisma.reddit_community_postsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "new":
      orderByInput = { created_at: "desc" };
      break;
    case "top":
      orderByInput = { vote_score: "desc" };
      break;
    case "hot":
      orderByInput = { vote_score: "desc", created_at: "desc" };
      break;
    case "controversial":
      orderByInput = { vote_score: "desc", created_at: "desc" };
      break;
    default:
      orderByInput = { created_at: "desc" };
  }
  const data = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityPostAtSumTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityPostAtSumTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
