import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformCommunitiesCommunityIdFeed(props: {
  communityId: string;
  body?: {
    page?: number;
    limit?: number;
    sort?: "hot" | "new" | "top" | "controversial";
    timeFilter?: string;
  };
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body?.page ?? 1;
  const limit = props.body?.limit ?? 10;
  const skip = (page - 1) * limit;
  // Parse sort and timeFilter from query parameters
  const sort = (props.body?.sort ?? "new") as
    | "hot"
    | "new"
    | "top"
    | "controversial";
  const timeFilter = props.body?.timeFilter ?? "all";
  const whereInput = {
    community_id: props.communityId,
    deleted_at: null,
  } satisfies Prisma.reddit_platform_postsWhereInput;
  // Sort order depends on sort algorithm
  const orderByInput = (
    sort === "hot"
      ? { hotScoreCache: { hot_score: "desc" } }
      : sort === "new"
        ? { created_at: "desc" }
        : sort === "top"
          ? { vote_score: "desc" }
          : { vote_score: "desc" }
  ) satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
  // For controversial sorting, we need to calculate based on vote distribution
  // Since Prisma doesn't support complex expressions, we'll fetch and sort in memory
  const data = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereInput,
    skip,
    take: limit + 1, // Fetch one extra to determine if there are more pages
    orderBy: orderByInput,
    select: {
      id: true,
      title: true,
      type: true,
      content: true,
      url: true,
      image_url: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      updated_at: true,
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          subscriber_count: true,
        },
      },
    },
  });
  // For controversial sort, calculate and sort in memory
  let finalData = data;
  if (sort === "controversial") {
    finalData = data
      .filter((post) => post.vote_score !== 0)
      .sort((a, b) => {
        const totalA = Math.abs(a.vote_score);
        const totalB = Math.abs(b.vote_score);
        if (totalA < 10 && totalB >= 10) return 1;
        if (totalA >= 10 && totalB < 10) return -1;
        if (totalA < 10 && totalB < 10) return 0;
        const minA = Math.min(a.vote_score, 0) + Math.max(a.vote_score, 0);
        const minB = Math.min(b.vote_score, 0) + Math.max(b.vote_score, 0);
        const ratioA = minA / (Math.abs(a.vote_score) || 1);
        const ratioB = minB / (Math.abs(b.vote_score) || 1);
        return ratioA - ratioB;
      })
      .slice(skip, skip + limit + 1);
  }
  // Determine if there are more pages
  const hasMore = finalData.length > limit;
  const paginatedData = hasMore ? finalData.slice(0, limit) : finalData;
  // Transform posts
  const transformedData = await Promise.all(
    paginatedData.map(async (post) => {
      const type = typia.assert<"TEXT" | "LINK" | "IMAGE">(post.type);
      const author = {
        id: post.author.id,
        username: post.author.username,
        displayName: post.author.display_name ?? undefined,
        avatarUrl: post.author.avatar_url ?? undefined,
      };
      const community = {
        id: post.community.id,
        name: post.community.name,
        description: post.community.description ?? undefined,
        iconUrl: post.community.icon_url ?? null,
        subscriberCount: post.community.subscriber_count,
      };
      return {
        id: post.id,
        title: post.title,
        type: type,
        author: author,
        community: community,
        voteScore: post.vote_score,
        commentCount: post.comment_count,
        createdAt: toISOStringSafe(post.created_at),
        contentPreview:
          type === "TEXT" ? (post.content?.substring(0, 200) ?? null) : null,
        imagePreview: type === "IMAGE" ? (post.image_url ?? null) : null,
        domainPreview:
          type === "LINK"
            ? post.url
              ? new URL(post.url).hostname
              : null
            : null,
      };
    }),
  );
  // Calculate total records for pagination
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
