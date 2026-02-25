import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getCommunityPlatformAdminPostsTrending(props: {
  admin: AdminPayload;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Get posts with vote scores and comment counts using Prisma aggregates
  const postsWithScores =
    await MyGlobal.prisma.community_platform_posts.findMany({
      where: {
        deleted_at: null,
      },
      include: {
        voteScore: true,
        comments: {
          where: {
            deleted_at: null,
          },
          select: {
            id: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
            karma: true,
            created_at: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            owner_user_id: true,
            created_at: true,
          },
        },
      },
      skip,
      take: limit,
    });
  // Transform each post to the required format
  const transformedPosts = postsWithScores.map((post) => {
    // Calculate trending score using the formula
    const upvotes = post.voteScore?.upvote_count ?? 0;
    const downvotes = post.voteScore?.downvote_count ?? 0;
    const commentCount = post.comments.length;
    // Calculate hours since creation
    const createdTimestamp = post.created_at.getTime();
    const currentTimestamp = Date.now();
    const hoursSinceCreation =
      (currentTimestamp - createdTimestamp) / (1000 * 60 * 60);
    const trendingScore =
      ((upvotes - downvotes) * Math.log(commentCount + 1)) /
      (hoursSinceCreation + 2);
    // Return post summary
    return {
      id: post.id,
      title: post.title,
      post_type: post.post_type,
      author: {
        id: post.user.id,
        username: post.user.username,
        display_name: post.user.display_name,
        avatar_url: post.user.avatar_url,
        karma: post.user.karma,
        created_at: post.user.created_at.toISOString(),
      } satisfies ICommunityPlatformUser.ISummary,
      community: {
        id: post.community.id,
        name: post.community.name,
        description: post.community.description,
        icon_url: post.community.icon_url,
        owner: {
          id: post.user.id,
          username: post.user.username,
          display_name: post.user.display_name,
          avatar_url: post.user.avatar_url,
          karma: post.user.karma,
          created_at: post.user.created_at.toISOString(),
        } satisfies ICommunityPlatformUser.ISummary,
        created_at: post.community.created_at.toISOString(),
      } satisfies ICommunityPlatformCommunity.ISummary,
      created_at: post.created_at.toISOString(),
    } satisfies ICommunityPlatformPost.ISummary;
  });
  // Get total count
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: {
      deleted_at: null,
    },
  });
  return {
    data: transformedPosts,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
