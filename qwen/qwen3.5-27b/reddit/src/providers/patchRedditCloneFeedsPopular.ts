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

export async function patchRedditCloneFeedsPopular(props: {
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(props.body.limit ?? 25, 1), 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_clone_postsWhereInput = {
    deleted_at: null,
    community: {
      deleted_at: null,
    },
    ...(props.body.communityId && {
      reddit_clone_community_id: props.body.communityId,
    }),
    ...(props.body.userId && {
      reddit_clone_user_profile_id: props.body.userId,
    }),
    ...(props.body.searchQuery && {
      title: {
        contains: props.body.searchQuery,
        mode: "insensitive",
      },
    }),
    ...(props.body.postType && {
      post_type: props.body.postType,
    }),
  };
  const sortType = props.body.sortType ?? "hot";
  if (sortType === "top" && props.body.timeFilter) {
    const now = new Date();
    let timeAgo: number;
    switch (props.body.timeFilter) {
      case "today":
        timeAgo = 24 * 60 * 60 * 1000;
        break;
      case "week":
        timeAgo = 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        timeAgo = 30 * 24 * 60 * 60 * 1000;
        break;
      case "year":
        timeAgo = 365 * 24 * 60 * 60 * 1000;
        break;
      case "all":
      default:
        timeAgo = 0;
    }
    if (timeAgo > 0) {
      whereInput.created_at = {
        gte: new Date(now.getTime() - timeAgo),
      };
    }
  }
  const orderByInput: Prisma.reddit_clone_postsOrderByWithRelationInput =
    sortType === "hot"
      ? { created_at: "desc" as const }
      : sortType === "new"
        ? { created_at: "desc" as const }
        : sortType === "top"
          ? { postVotes: { _count: "desc" as const } }
          : sortType === "controversial"
            ? { postVotes: { _count: "desc" as const } }
            : { created_at: "desc" as const };
  const records = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
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
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditClonePostAtSummaryTransformer.transform,
    ),
  };
}
