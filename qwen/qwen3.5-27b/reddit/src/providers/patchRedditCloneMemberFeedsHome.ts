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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostAtSummaryTransformer } from "../transformers/RedditClonePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberFeedsHome(props: {
  member: MemberPayload;
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 25, 100);
  const skip = (page - 1) * limit;
  const communityFilter: Prisma.reddit_clone_communitiesWhereInput = {
    deleted_at: null,
    subscriptions: {
      some: {
        reddit_clone_member_id: props.member.id,
        deleted_at: null,
      },
    },
  };
  if (props.body.communityId) {
    communityFilter.id = props.body.communityId;
  }
  const whereInput: Prisma.reddit_clone_postsWhereInput = {
    deleted_at: null,
    community: communityFilter,
  };
  if (props.body.userId) {
    whereInput.userProfile = {
      id: props.body.userId,
    };
  }
  if (props.body.searchQuery) {
    whereInput.title = {
      contains: props.body.searchQuery,
      mode: "insensitive",
    };
  }
  if (props.body.postType) {
    whereInput.post_type = props.body.postType;
  }
  if (
    props.body.sortType === "top" &&
    props.body.timeFilter &&
    props.body.timeFilter !== "all"
  ) {
    const now = new Date();
    let timeThreshold: Date;
    switch (props.body.timeFilter) {
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
  const orderByInput: Prisma.reddit_clone_postsOrderByWithRelationInput =
    props.body.sortType === "new"
      ? { created_at: "desc" as const }
      : props.body.sortType === "top"
        ? { postVotes: { _count: "desc" as const } }
        : props.body.sortType === "controversial"
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
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditClonePostAtSummaryTransformer.transform,
    ),
  };
}
