import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberFeedsHome(props: {
  member: MemberPayload;
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  // Get subscribed community IDs for the member
  const subscriptions =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findMany({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        community_id: true,
      },
    });
  // If no subscriptions, return empty result
  if (subscriptions.length === 0) {
    return {
      pagination: {
        current: props.body.page ?? 1,
        limit: props.body.limit ?? 20,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    } satisfies IPageIRedditPlatformPost.ISummary;
  }
  const communityIds = subscriptions.map((s) => s.community_id);
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build where clause for subscribed communities
  const whereInput: Prisma.reddit_platform_postsWhereInput = {
    community_id: {
      in: communityIds,
    },
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        {
          title: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          text_content: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ],
    }),
  };
  // Handle time filter for top sorting
  const now = new Date();
  if (props.body.sort_by === "top") {
    if (!props.body.time_filter) {
      throw new HttpException(
        "time_filter is required when sort_by is 'top'",
        400,
      );
    }
    let timeBoundary: Date;
    switch (props.body.time_filter) {
      case "today":
        timeBoundary = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        break;
      case "week":
        timeBoundary = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        timeBoundary = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        timeBoundary = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "all_time":
        timeBoundary = new Date(0);
        break;
      default:
        timeBoundary = new Date(0);
    }
    whereInput.created_at = { gte: timeBoundary };
  }
  // Build orderBy based on sort_by
  const orderByInput: Prisma.reddit_platform_postsOrderByWithRelationInput =
    props.body.sort_by === "new"
      ? { created_at: "desc" as const }
      : props.body.sort_by === "top"
        ? { created_at: "desc" as const }
        : props.body.sort_by === "controversial"
          ? { created_at: "desc" as const }
          : { created_at: "desc" as const }; // hot default
  // Fetch posts with transformer select
  const posts = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditPlatformPostAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
  });
  // Transform posts
  const data = await ArrayUtil.asyncMap(
    posts,
    RedditPlatformPostAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditPlatformPost.ISummary;
}
