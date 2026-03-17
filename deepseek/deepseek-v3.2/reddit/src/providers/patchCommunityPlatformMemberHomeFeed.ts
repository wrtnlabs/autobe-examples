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

export async function patchCommunityPlatformMemberHomeFeed(props: {
  member: MemberPayload;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  // 1. Get active subscriptions for the member
  const subscriptions =
    await MyGlobal.prisma.community_platform_subscriptions.findMany({
      where: {
        member_id: props.member.id,
        active: true,
        deleted_at: null,
      },
      select: {
        community_id: true,
      },
    });
  if (subscriptions.length === 0) {
    return {
      data: [],
      pagination: {
        current: props.body.page,
        limit: props.body.limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  const communityIds = subscriptions.map((s) => s.community_id);
  // If community_id filter is provided, ensure member is subscribed to that community
  if (
    props.body.community_id &&
    !communityIds.includes(props.body.community_id)
  ) {
    throw new HttpException("You are not subscribed to this community", 403);
  }
  // 2. Build where clause
  const whereInput: Prisma.community_platform_postsWhereInput = {
    community_platform_community_id: { in: communityIds },
    deleted_at: null,
    ...(props.body.community_id && {
      community_platform_community_id: props.body.community_id,
    }),
    ...(props.body.author_id && {
      community_platform_member_id: props.body.author_id,
    }),
    ...(props.body.content_type && { content_type: props.body.content_type }),
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
  };
  // 3. Apply sorting - for now use basic sorting, complex sorting requires aggregation
  const orderByInput = (() => {
    switch (props.body.sort) {
      case "new":
        return { created_at: "desc" as const };
      case "hot":
        // Hot sorting would require vote recency weighting
        return { created_at: "desc" as const };
      case "top": {
        // For top sorting with time filter, adjust WHERE clause
        if (props.body.top_time_range) {
          const now = Date.now();
          let cutoffTime: number;
          switch (props.body.top_time_range) {
            case "today":
              cutoffTime = now - 24 * 60 * 60 * 1000;
              break;
            case "week":
              cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
              break;
            case "month":
              cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
              break;
            case "year":
              cutoffTime = now - 365 * 24 * 60 * 60 * 1000;
              break;
            default:
              cutoffTime = 0; // 'all'
          }
          // Handle whereInput.created_at being potentially undefined
          const existingCreatedAt = whereInput.created_at;
          whereInput.created_at = {
            ...(existingCreatedAt && typeof existingCreatedAt === "object"
              ? existingCreatedAt
              : {}),
            gte: new Date(cutoffTime),
          };
        }
        return { created_at: "desc" as const };
      }
      case "controversial":
        // Controversial would require vote count and score calculations
        return { created_at: "desc" as const };
      default:
        return { created_at: "desc" as const };
    }
  })() satisfies Prisma.community_platform_postsOrderByWithRelationInput;
  // 4. Pagination calculation
  const skip = (props.body.page - 1) * props.body.limit;
  const take = props.body.limit;
  // 5. Query posts with pagination
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take,
    ...CommunityPlatformPostAtSummaryTransformer.select(),
  });
  // 6. Total count
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: whereInput,
  });
  // 7. Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      posts,
      CommunityPlatformPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: props.body.page,
      limit: props.body.limit,
      records: total,
      pages: Math.ceil(total / props.body.limit),
    } satisfies IPage.IPagination,
  };
}
