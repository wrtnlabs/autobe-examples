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

export async function patchCommunityPlatformPostsPopular(props: {
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const { sort = "hot", timeRange, page = 1, limit = 20 } = props.body;
  // Validate pagination bounds
  const actualPage = Math.max(1, page ?? 1);
  const actualLimit = Math.min(100, Math.max(1, limit ?? 20));
  const skip = (actualPage - 1) * actualLimit;
  // Build dynamic where condition for non-deleted posts
  const whereInput = {
    deleted_at: null,
  } satisfies Prisma.community_platform_postsWhereInput;
  // Build orderBy condition based on sort type
  let orderByInput: any;
  if (sort === "hot") {
    orderByInput = {
      _raw: [
        "(LOG((SELECT COUNT(*) FROM community_platform_post_votes WHERE post_id = community_platform_posts.id AND vote_type = 'up') + 1) / ((EXTRACT(EPOCH, FROM(NOW() - community_platform_posts.created_at)) / 3600) + 2) DESC",
      ],
    };
  } else if (sort === "new") {
    orderByInput = { created_at: "desc" as const };
  } else if (sort === "top") {
    orderByInput = { vote_score: "desc" as const };
  } else if (sort === "controversial") {
    orderByInput = {
      _raw: [
        "(SELECT COUNT(*) FROM community_platform_post_votes WHERE post_id = community_platform_posts.id) DESC, ABS((SELECT SUM(CASE WHEN vote_type = 'up' THEN 1 WHEN vote_type = 'down' THEN -1 ELSE 0 END) FROM community_platform_post_votes WHERE post_id = community_platform_posts.id) ASC",
      ],
    };
  } else {
    orderByInput = { created_at: "desc" as const };
  }
  // Fetch data with minimal selection (using select NOT include)
  const data = await MyGlobal.prisma.community_platform_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: actualLimit,
    select: {
      id: true,
      created_at: true,
      title: true,
      author_id: true,
      community_id: true,
      // Removed post_type as it's not a valid field in Prisma select
      vote_score: true,
      comment_count: true,
    },
  });
  // Calculate total count for pagination
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: whereInput,
  });
  // Fetch community details
  const communityIds = [...new Set(data.map((post) => post.community_id))];
  const communities =
    await MyGlobal.prisma.community_platform_communities.findMany({
      where: { id: { in: communityIds } },
      select: {
        id: true,
        name: true,
        icon: true,
        subscriber_count: true,
        created_at: true,
        // Added description to satisfy ISummary requirement
        description: true,
      },
    });
  const communityMap = new Map(communities.map((c) => [c.id, c]));
  // Fetch author details
  const authorIds = [...new Set(data.map((post) => post.author_id))];
  const authors = await MyGlobal.prisma.community_platform_members.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, username: true },
  });
  const authorMap = new Map(authors.map((a) => [a.id, a]));
  // Fetch votes for vote count calculation
  const postIds = data.map((post) => post.id);
  const votes = await MyGlobal.prisma.community_platform_post_votes.findMany({
    where: { post_id: { in: postIds } },
    select: { post_id: true, vote_type: true },
  });
  // Map votes to posts - cast vote_type to string
  const votesByPost = new Map<
    string,
    {
      vote_type: string;
    }[]
  >();
  votes.forEach((vote) => {
    if (!votesByPost.has(vote.post_id)) {
      votesByPost.set(vote.post_id, []);
    }
    votesByPost.get(vote.post_id)!.push({
      vote_type: vote.vote_type.toString(), // Cast number to string
    });
  });
  // Calculate net vote score for each post
  const calculateNetVoteScore = (
    postVotes: {
      vote_type: string;
    }[],
  ): number => {
    if (!postVotes || !Array.isArray(postVotes)) return 0;
    return postVotes.reduce((score, vote) => {
      if (vote.vote_type === "up") return score + 1;
      if (vote.vote_type === "down") return score - 1;
      return score;
    }, 0);
  };
  // Transform data to post summaries
  const summaryData = data.map((post) => ({
    id: post.id as string & tags.Format<"uuid">,
    author: {
      id: post.author_id as string & tags.Format<"uuid">,
      // Fetch username from author map
      username: authorMap.get(post.author_id)?.username || "",
    },
    community: {
      // Fetch community details from community map
      name: communityMap.get(post.community_id)?.name || "",
      icon: communityMap.get(post.community_id)?.icon as string &
        tags.Format<"uri">,
      subscriber_count:
        communityMap.get(post.community_id)?.subscriber_count || 0,
      created_at: communityMap.get(post.community_id)
        ? toISOStringSafe(
            communityMap.get(post.community_id)?.created_at || new Date(),
          )
        : toISOStringSafe(new Date()),
      // Added missing description property for ISummary compatibility
      description: communityMap.get(post.community_id)?.description || "",
    },
    voteScore: calculateNetVoteScore(votesByPost.get(post.id) || []) as number &
      tags.Type<"int32"> &
      tags.Minimum<-999999>,
    commentCount: post.comment_count as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    createdAt: toISOStringSafe(post.created_at) as string &
      tags.Format<"date-time">,
  }));
  return {
    pagination: {
      current: actualPage,
      limit: actualLimit,
      records: total,
      pages: Math.ceil(total / actualLimit),
    } satisfies IPage.IPagination,
    data: summaryData as ICommunityPlatformPost.ISummary[],
  };
}
