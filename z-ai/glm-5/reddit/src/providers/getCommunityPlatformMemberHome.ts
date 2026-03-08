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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberHome(props: {
  member: MemberPayload;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  // Query active subscriptions to get subscribed community IDs
  const subscriptions =
    await MyGlobal.prisma.community_platform_subscriptions.findMany({
      where: {
        member_id: props.member.id,
        is_active: true,
      },
      select: {
        community_id: true,
      },
    });
  // If no subscriptions, return empty page
  if (subscriptions.length === 0) {
    return {
      data: [],
      pagination: {
        current: 1,
        limit: 100,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  const subscribedCommunityIds = subscriptions.map((s) => s.community_id);
  // Count total posts from subscribed communities
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: {
      community_id: { in: subscribedCommunityIds },
      deleted_at: null,
    },
  });
  // Default pagination values
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query posts with joins using transformer select
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: {
      community_id: { in: subscribedCommunityIds },
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityPlatformPostAtSummaryTransformer.select(),
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    posts,
    CommunityPlatformPostAtSummaryTransformer.transform,
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
