import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostAtSummaryTransformer } from "../transformers/RedditClonePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneCommunitiesCommunityIdFeeds(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_clone_postsWhereInput = {
    reddit_clone_community_id: props.communityId,
    deleted_at: null,
  };
  const sortType = props.body.sortType ?? "hot";
  const timeFilter = props.body.timeFilter ?? "all";
  if (sortType === "top" && timeFilter !== "all") {
    const now = new Date();
    let timeThreshold: Date;
    switch (timeFilter) {
      case "today":
        timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        timeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        timeThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        timeThreshold = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeThreshold = new Date(0);
    }
    whereInput.created_at = {
      gte: timeThreshold,
    };
  }
  let orderByInput: Prisma.reddit_clone_postsOrderByWithRelationInput;
  switch (sortType) {
    case "new":
      orderByInput = { created_at: "desc" as const };
      break;
    case "top":
      orderByInput = {
        postVotes: { _count: "desc" as const },
        created_at: "desc" as const,
      };
      break;
    case "controversial":
      orderByInput = {
        postVotes: { _count: "desc" as const },
        created_at: "desc" as const,
      };
      break;
    case "hot":
    default:
      orderByInput = { created_at: "desc" as const };
      break;
  }
  const records = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditClonePostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      RedditClonePostAtSummaryTransformer.transform,
    ),
  };
}
