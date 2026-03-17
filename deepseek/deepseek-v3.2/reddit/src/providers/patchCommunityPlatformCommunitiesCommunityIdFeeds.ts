import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommunitiesCommunityIdFeeds(props: {
  communityId: string;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  // Verify community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Build WHERE clause
  const whereInput = {
    community_platform_community_id: props.communityId,
    deleted_at: null,
    ...(props.body.author_id && {
      community_platform_member_id: props.body.author_id,
    }),
    ...(props.body.content_type && {
      content_type: props.body.content_type,
    }),
    ...(props.body.created_at_start && {
      created_at: {
        gte: new Date(props.body.created_at_start),
      },
    }),
    ...(props.body.created_at_end && {
      created_at: {
        lte: new Date(props.body.created_at_end),
      },
    }),
  } satisfies Prisma.community_platform_postsWhereInput;
  // Handle top_time_range filter for Top sorting
  let topTimeFilter = undefined;
  if (props.body.sort === "top" && props.body.top_time_range) {
    const now = new Date();
    let startDate = new Date();
    switch (props.body.top_time_range) {
      case "today":
        startDate.setDate(now.getDate() - 1);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case "all":
        // No date filter
        break;
    }
    if (props.body.top_time_range !== "all") {
      topTimeFilter = { created_at: { gte: startDate } };
    }
  }
  // Combine WHERE filters
  const finalWhere = topTimeFilter
    ? { ...whereInput, ...topTimeFilter }
    : whereInput;
  // Determine orderBy based on sort algorithm
  let orderBy = {};
  if (props.body.sort === "new") {
    orderBy = { created_at: "desc" as const };
  } else if (props.body.sort === "hot") {
    // Hot sorting requires complex calculation, we'll approximate with vote score and recency
    orderBy = [
      { postVotes: { _count: "desc" as const } },
      { created_at: "desc" as const },
    ];
  } else if (props.body.sort === "top") {
    orderBy = [
      // Need to calculate vote score dynamically
      // This is a placeholder - will need to compute vote scores
      { created_at: "desc" as const },
    ];
  } else if (props.body.sort === "controversial") {
    // Controversial posts have many votes but score near zero
    orderBy = [
      { postVotes: { _count: "desc" as const } },
      { created_at: "desc" as const },
    ];
  }
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Fetch posts
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: finalWhere,
    ...CommunityPlatformPostAtSummaryTransformer.select(),
    skip,
    take: limit,
    orderBy,
  });
  // Transform posts
  const transformed = await ArrayUtil.asyncMap(
    posts,
    CommunityPlatformPostAtSummaryTransformer.transform,
  );
  // Get total count
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: finalWhere,
  });
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
