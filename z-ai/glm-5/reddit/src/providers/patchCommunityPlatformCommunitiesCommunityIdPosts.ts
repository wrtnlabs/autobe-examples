import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
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

export async function patchCommunityPlatformCommunitiesCommunityIdPosts(props: {
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  // Validate community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Parse parameters with defaults
  const sort = props.body.sort ?? "hot";
  const timeRange = props.body.time_range ?? "all";
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;
  // Build time filter for 'top' sort
  const now = new Date();
  let createdAtThreshold: Date | undefined = undefined;
  if (sort === "top" && timeRange !== "all") {
    const intervals: Record<string, number> = {
      today: 1,
      week: 7,
      month: 30,
      year: 365,
    };
    const days = intervals[timeRange];
    if (days !== undefined) {
      createdAtThreshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }
  }
  // Build WHERE clause
  const whereClause = {
    community_id: props.communityId,
    deleted_at: null,
    ...(createdAtThreshold !== undefined && {
      created_at: { gte: createdAtThreshold },
    }),
  } satisfies Prisma.community_platform_postsWhereInput;
  // Fetch all matching posts (need to sort in JS for hot/controversial)
  const allPosts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: whereClause,
    ...CommunityPlatformPostAtSummaryTransformer.select(),
  });
  // Transform and compute additional fields for sorting
  type PostWithScores = ICommunityPlatformPost.ISummary & {
    hotScore: number;
    totalVotes: number;
    createdTimestamp: number;
  };
  const transformedPosts: PostWithScores[] = await ArrayUtil.asyncMap(
    allPosts,
    async (post) => {
      const summary =
        await CommunityPlatformPostAtSummaryTransformer.transform(post);
      // For hot sorting, compute hot score
      const ageHours =
        (now.getTime() - post.created_at.getTime()) / (1000 * 60 * 60) + 2;
      const hotScore = summary.voteScore / Math.pow(ageHours, 1.8);
      // For controversial sorting
      const totalVotes = post.votes.length;
      return {
        ...summary,
        hotScore,
        totalVotes,
        createdTimestamp: post.created_at.getTime(),
      };
    },
  );
  // Sort based on sort type
  let sortedPosts: PostWithScores[];
  if (sort === "hot") {
    sortedPosts = [...transformedPosts].sort((a, b) => b.hotScore - a.hotScore);
  } else if (sort === "new") {
    sortedPosts = [...transformedPosts].sort(
      (a, b) => b.createdTimestamp - a.createdTimestamp,
    );
  } else if (sort === "top") {
    sortedPosts = [...transformedPosts].sort(
      (a, b) => b.voteScore - a.voteScore,
    );
  } else {
    // controversial: high total votes with low absolute vote score
    sortedPosts = [...transformedPosts].sort((a, b) => {
      if (a.totalVotes !== b.totalVotes) {
        return b.totalVotes - a.totalVotes;
      }
      return Math.abs(a.voteScore) - Math.abs(b.voteScore);
    });
  }
  // Apply pagination
  const paginatedPosts = sortedPosts.slice(skip, skip + limit);
  // Count total
  const totalRecords = allPosts.length;
  // Build pagination metadata
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: totalRecords,
    pages: Math.ceil(totalRecords / limit),
  };
  // Return paginated result without the extra computed fields
  return {
    data: paginatedPosts.map((p) => ({
      id: p.id,
      title: p.title,
      postType: p.postType,
      author: p.author,
      community: p.community,
      voteScore: p.voteScore,
      commentCount: p.commentCount,
      textPreview: p.textPreview,
      urlDomain: p.urlDomain,
      thumbnailUrl: p.thumbnailUrl,
      createdAt: p.createdAt,
    })),
    pagination,
  } satisfies IPageICommunityPlatformPost.ISummary;
}
