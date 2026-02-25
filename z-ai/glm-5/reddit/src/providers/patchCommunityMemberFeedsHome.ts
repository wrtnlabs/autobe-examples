import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPostAtSummaryTransformer } from "../transformers/CommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberFeedsHome(props: {
  member: MemberPayload;
  body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
  // 1. Get subscribed communities
  const subscriptions = await MyGlobal.prisma.community_subscriptions.findMany({
    where: { community_member_id: props.member.id },
    select: { community_community_id: true },
  });
  const subscribedCommunityIds = subscriptions.map(
    (s) => s.community_community_id,
  );
  // If no subscriptions, return empty result
  if (subscribedCommunityIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: 1,
        limit: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
          props.body.limit ?? 25,
        ),
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // 2. Get banned communities to exclude
  const now = new Date();
  const bans = await MyGlobal.prisma.community_bans.findMany({
    where: {
      member_id: props.member.id,
      OR: [{ expired_at: null }, { expired_at: { gt: now } }],
    },
    select: { community_id: true },
  });
  const bannedCommunityIds = bans.map((b) => b.community_id);
  const allowedCommunityIds = subscribedCommunityIds.filter(
    (id) => !bannedCommunityIds.includes(id),
  );
  if (allowedCommunityIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: 1,
        limit: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
          props.body.limit ?? 25,
        ),
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // 3. Build query parameters
  const sort = props.body.sort ?? "hot";
  const time = props.body.time ?? "all";
  const limit = typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
    props.body.limit ?? 25,
  );
  const page = typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
    Math.max(1, props.body.page ?? 1),
  );
  const skip = (page - 1) * limit;
  // Time filter for 'top' sorting
  let timeFilter: Date | undefined;
  if (sort === "top") {
    switch (time) {
      case "today":
        timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        timeFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        timeFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeFilter = undefined;
    }
  }
  // 4. Build WHERE clause
  const whereInput = {
    community_id: { in: allowedCommunityIds },
    is_deleted: false,
    ...(props.body.search && {
      OR: [
        {
          title: { contains: props.body.search, mode: "insensitive" as const },
        },
        {
          text_content: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(props.body.communityId && { community_id: props.body.communityId }),
    ...(props.body.authorId && { author_id: props.body.authorId }),
    ...(props.body.postType && { post_type: props.body.postType }),
    ...(timeFilter && { created_at: { gte: timeFilter } }),
  } satisfies Prisma.community_postsWhereInput;
  // 5. Build ORDER BY based on sort algorithm
  const orderByInput = (
    sort === "new"
      ? [{ created_at: "desc" as const }]
      : sort === "top"
        ? [{ vote_score: "desc" as const }, { created_at: "desc" as const }]
        : sort === "controversial"
          ? [
              { controversy_score: "desc" as const },
              { created_at: "desc" as const },
            ]
          : [{ hot_score: "desc" as const }, { created_at: "desc" as const }]
  ) satisfies Prisma.community_postsOrderByWithRelationInput[];
  // 6. Query posts with transformer select
  const posts = await MyGlobal.prisma.community_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityPostAtSummaryTransformer.select(),
  });
  // 7. Count total for pagination
  const total = await MyGlobal.prisma.community_posts.count({
    where: whereInput,
  });
  // 8. Transform results using the transformer
  const data = await ArrayUtil.asyncMap(
    posts,
    CommunityPostAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
