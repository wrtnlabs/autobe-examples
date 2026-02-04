import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";

export async function patchCommunityPlatformMemberPostsTop(props: {
  member: MemberPayload;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const { sort, timeRange, page = 1, limit = 20 } = props.body;
  // Validate sort parameter - must be 'hot'
  if (sort !== "hot") {
    throw new HttpException(
      "Only hot sort is supported for this endpoint",
      400,
    );
  }
  // Ensure page and limit are not null before use
  const safePage = page !== null && page !== undefined ? page : 1;
  const safeLimit = limit !== null && limit !== undefined ? limit : 20;
  // Calculate offset for cursor-based pagination
  const skip = (safePage - 1) * safeLimit;
  // Build where condition based on timeRange
  const whereInput: Prisma.community_platform_postsWhereInput = {
    deleted_at: null,
    // Join with communities to filter out private/deleted communities
    community: {
      deleted_at: null,
    },
  };
  // Apply time filter if specified
  let cutoffDate: Date | undefined = undefined;
  if (timeRange) {
    const now = new Date();
    switch (timeRange) {
      case "today":
        cutoffDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "this week":
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now.setDate(now.getDate() - dayOfWeek));
        cutoffDate = new Date(startOfWeek.setHours(0, 0, 0, 0));
        break;
      case "this month":
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "this year":
        cutoffDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "all time":
        // No cutoff, include all posts
        break;
    }
    // Filter posts after cutoff date
    if (timeRange !== "all time" && cutoffDate !== undefined) {
      whereInput.created_at = {
        gte: toISOStringSafe(cutoffDate),
      };
    }
  }
  // Calculate hot score: LOG(vote_score + 1) / (HOUR_DIFF / 3600 + 2)
  // Use prisma.$queryRaw to compute this in SQL
  const rawPosts = await MyGlobal.prisma.$queryRaw<
    {
      id: string;
      created_at: Date;
      vote_score: number;
      comment_count: number;
      "author.id": string;
      "community.id": string;
      "community.name": string;
      "community.description": string | null;
      "community.icon": string | null;
      "community.subscriber_count": number;
      "community.created_at": Date;
    }[]
  >`
    SELECT 
      cpp.id, 
      cpp.created_at, 
      cpp.vote_score, 
      cpp.comment_count, 

      cm.id as "author.id",

      cc.id as "community.id",
      cc.name as "community.name", 
      cc.description as "community.description", 
      cc.icon as "community.icon", 
      cc.subscriber_count as "community.subscriber_count", 
      cc.created_at as "community.created_at"
    FROM community_platform_posts cpp
    JOIN community_platform_members cm ON cpp.author_id = cm.id
    JOIN community_platform_communities cc ON cpp.community_id = cc.id
    WHERE cpp.deleted_at IS NULL 
      AND cc.deleted_at IS NULL
      ${timeRange !== "all time" && cutoffDate !== undefined ? Prisma.raw(`AND cpp.created_at >= '${toISOStringSafe(cutoffDate)}'`) : Prisma.raw("")}
    ORDER BY (LOG(1 + COALESCE(cpp.vote_score, 0)) / (GREATEST(TIMESTAMPDIFF(HOUR, cpp.created_at, NOW()), 0) / 3600 + 2)) DESC
    LIMIT ${safeLimit} OFFSET ${skip}
  `;
  // Count total matching posts
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: whereInput,
  });
  // Transform raw posts structure to match transformer expectation
  const transformedRawPosts = rawPosts.map((post) => ({
    id: post.id,
    created_at: post.created_at,
    vote_score: post.vote_score,
    comment_count: post.comment_count,
    title: "",
    updated_at: new Date(),
    deleted_at: null,
    author: {
      id: post["author.id"],
    },
    community: {
      id: post["community.id"],
      name: post["community.name"],
      description: post["community.description"] || "",
      icon: post["community.icon"] || "",
      subscriber_count: post["community.subscriber_count"],
      created_at: post["community.created_at"],
    },
  }));
  // Transform using existing transformer for type safety
  const transformedPosts = await ArrayUtil.asyncMap(
    transformedRawPosts,
    CommunityPlatformPostAtSummaryTransformer.transform,
  );
  // Ensure types satisfy IPage.IPagination requirements
  const currentNum: number = safePage satisfies number as number;
  const limitNum: number = safeLimit satisfies number as number;
  return {
    data: transformedPosts,
    pagination: {
      current: currentNum,
      limit: limitNum,
      records: total,
      pages: Math.ceil(total / limitNum),
    } satisfies IPage.IPagination,
  };
}
