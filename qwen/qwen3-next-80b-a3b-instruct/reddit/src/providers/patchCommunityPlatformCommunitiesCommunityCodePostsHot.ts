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
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";

export async function patchCommunityPlatformCommunitiesCommunityCodePostsHot(props: {
  communityCode: string;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  // Validate community exists by code
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: {
        code: props.communityCode,
      } as unknown as Prisma.community_platform_communitiesWhereUniqueInput,
      select: { id: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get total count of posts in community
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: {
      community_id: community.id,
      deleted_at: null,
    },
  });
  // Calculate the 'hot' score in the ORDER BY clause using database functions
  // hot = log(upvotes + 1) / (time since creation in hours + 2)
  // Assuming vote_score is precomputed as upvotes - downvotes
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: {
      community_id: community.id,
      deleted_at: null,
    },
    orderBy: {
      vote_score: "desc",
      created_at: "desc",
    },
    skip,
    take: limit,
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      author_id: true,
      vote_score: true,
      community_id: true,
      title: true,
      comment_count: true,
      author: {
        select: {
          id: true,
        },
      },
      community: {
        select: {
          id: true,
          created_at: true,
          name: true,
          description: true,
          icon: true,
          subscriber_count: true,
        },
      },
    },
  });
  // Transform the results using the existing transformer
  const transformedPosts = await ArrayUtil.asyncMap(
    posts,
    CommunityPlatformPostAtSummaryTransformer.transform,
  );
  return {
    data: transformedPosts,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
