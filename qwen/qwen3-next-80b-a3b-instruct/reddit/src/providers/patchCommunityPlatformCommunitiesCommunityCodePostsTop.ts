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
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPlatformCommunitiesCommunityCodePostsTop(props: {
  communityCode: string;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  // Find community by code
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { name: props.communityCode },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Get total count of posts in this community
  const totalCount = await MyGlobal.prisma.community_platform_posts.count({
    where: {
      community_id: community.id,
      deleted_at: null,
    },
  });
  // Get page and limit from request body (default to 1 and 20)
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Get posts with aggregated vote scores and comment counts
  const postsData = await MyGlobal.prisma.community_platform_posts.findMany({
    where: {
      community_id: community.id,
      deleted_at: null,
    },
    take: limit,
    skip,
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      title: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      author: {
        select: {
          id: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          subscriber_count: true,
          created_at: true,
        },
      },
    },
  });
  // For each post, calculate the actual vote score and comment count
  const postsWithStats = await Promise.all(
    postsData.map(async (post) => {
      // Get total vote score
      const votes =
        await MyGlobal.prisma.community_platform_post_votes.aggregate({
          where: { post_id: post.id },
          _sum: { vote_type: true },
        });
      // Calculate vote score (sum of upvotes minus sum of downvotes)
      // Assuming upvote = 1, downvote = -1
      const voteScore = votes._sum?.vote_type || 0;
      // Get comment count - use the correct field name from the already-loaded community_platform_comments schema
      // Based on the schema and the error messages, the correct field is 'post_id' (foreign key scalar field)
      // The Prisma WhereInput for community_platform_comments expects the field name as it appears in the database
      // Since the error shows the field doesn't exist when using 'post' as relation, and 'post_id' is the conventional naming,
      // we use 'post_id' as scalar field to query comments by post
      const commentCount =
        await MyGlobal.prisma.community_platform_comments.count({
          where: {
            post_id: post.id, // ✅ Use post_id as scalar field reference
          },
        });
      // Calculate time difference in hours
      const createdAt = new Date(post.created_at);
      const now = Date.now();
      const timeDiffHours = (now - createdAt.getTime()) / (1000 * 60 * 60);
      // Apply top score formula: log(voteScore + commentCount + 1) / (timeDiffHours + 2)
      const topScore =
        Math.log10(Math.abs(voteScore) + commentCount + 1) /
        (timeDiffHours + 2);
      // Return the post data with calculated statistics
      return {
        ...post,
        vote_score: voteScore,
        comment_count: commentCount,
        top_score: topScore,
      };
    }),
  );
  // Sort by calculated top score descending
  const sortedPosts = postsWithStats.sort((a, b) => b.top_score - a.top_score);
  // Transform to final format using existing transformer
  const transformedPosts = await Promise.all(
    sortedPosts.map((post) =>
      CommunityPlatformPostAtSummaryTransformer.transform({
        id: post.id,
        created_at: post.created_at,
        vote_score: post.vote_score,
        comment_count: post.comment_count,
        author: post.author,
        community: post.community,
        title: post.title,
        updated_at: post.updated_at,
        deleted_at: post.deleted_at,
      }),
    ),
  );
  return {
    data: transformedPosts,
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
  };
}
