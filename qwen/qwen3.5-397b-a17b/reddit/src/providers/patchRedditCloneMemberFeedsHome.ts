import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
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
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const subscribedCommunities =
    await MyGlobal.prisma.reddit_clone_subscriptions.findMany({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        community_id: true,
      },
    });
  const communityIds = subscribedCommunities.map((s) => s.community_id);
  if (communityIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  const timeFilter = (() => {
    if (props.body.sort !== "top") return undefined;
    switch (props.body.timeFilter) {
      case "today":
        return new Date(Date.now() - 24 * 60 * 60 * 1000);
      case "this_week":
        return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      case "this_month":
        return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      case "this_year":
        return new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      case "all_time":
      default:
        return undefined;
    }
  })();
  const whereInput: Prisma.reddit_clone_postsWhereInput = {
    community_id: { in: communityIds },
    deleted_at: null,
    ...(props.body.search && {
      title: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(timeFilter && {
      created_at: { gte: timeFilter },
    }),
  };
  const orderByInput = (() => {
    switch (props.body.sort) {
      case "hot":
        return { created_at: "desc" as const };
      case "new":
        return { created_at: "desc" as const };
      case "top":
        return { created_at: "desc" as const };
      case "controversial":
        return { created_at: "desc" as const };
      default:
        return { created_at: "desc" as const };
    }
  })();
  const data = await MyGlobal.prisma.reddit_clone_posts.findMany({
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
    data: await ArrayUtil.asyncMap(
      data,
      RedditClonePostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
