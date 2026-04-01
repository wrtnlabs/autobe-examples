import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditCommunityCommunityAtSummaryTransformer } from "../transformers/RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "../transformers/RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityGuestFeedsPopular(props: {
  guest: GuestPayload;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "hot";
  const timeFilter = props.body.timeFilter ?? "all";
  const feedType = props.body.feedType ?? "popular";
  const postType = props.body.postType;
  const minScore = props.body.minScore;
  const communityName = props.body.communityName;
  // Build where clause for filtering
  const whereInput: Prisma.reddit_community_postsWhereInput = {
    deleted_at: null,
    ...(postType && { post_type: postType }),
  };
  // Apply community filter if feedType is community
  if (feedType === "community" && communityName) {
    const community =
      await MyGlobal.prisma.reddit_community_communities.findUnique({
        where: { name: communityName, deleted_at: null },
        select: { id: true },
      });
    if (community) {
      whereInput.reddit_community_community_id = community.id;
    }
  }
  // Apply time filter for top sorting
  if (sort === "top" && timeFilter !== "all") {
    const now = new Date();
    let startDate: Date;
    switch (timeFilter) {
      case "today":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }
    whereInput.created_at = { gte: startDate };
  }
  // For minScore filtering, we need to fetch with votes and filter manually
  // since Prisma doesn't support HAVING clauses directly
  const fetchWithVotes =
    sort === "top" ||
    sort === "hot" ||
    sort === "controversial" ||
    minScore !== undefined;
  if (fetchWithVotes) {
    // Fetch all posts in the range with votes for sorting/filtering
    const allPosts = await MyGlobal.prisma.reddit_community_posts.findMany({
      where: whereInput,
      include: {
        votes: {
          select: {
            direction: true,
          },
        },
        author: RedditCommunityMemberAtSummaryTransformer.select(),
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
        comments: {
          select: {
            id: true,
            deleted_at: true,
          },
        } satisfies Prisma.reddit_community_commentsFindManyArgs,
      },
      orderBy: { created_at: "desc" },
    });
    // Compute vote scores and filter by minScore
    const postsWithScores = allPosts.map((post) => ({
      post,
      vote_score: post.votes.reduce((sum, vote) => {
        return (
          sum +
          (vote.direction === "UPVOTE"
            ? 1
            : vote.direction === "DOWNVOTE"
              ? -1
              : 0)
        );
      }, 0),
      total_votes: post.votes.length,
    }));
    // Filter by minScore if specified
    let filtered = postsWithScores;
    if (minScore !== undefined) {
      filtered = postsWithScores.filter((p) => p.vote_score >= minScore);
    }
    // Sort based on sort method
    const now = new Date();
    filtered.sort((a, b) => {
      switch (sort) {
        case "top":
          return b.vote_score - a.vote_score;
        case "controversial":
          // High vote count with score near zero
          const aControversy = a.total_votes / (Math.abs(a.vote_score) + 1);
          const bControversy = b.total_votes / (Math.abs(b.vote_score) + 1);
          return bControversy - aControversy;
        case "hot":
        default:
          // Hot: combination of score and recency (simplified: score with time decay)
          const aAge = now.getTime() - a.post.created_at.getTime();
          const bAge = now.getTime() - b.post.created_at.getTime();
          const aHot =
            a.vote_score / Math.pow(aAge / (1000 * 60 * 60) + 2, 1.5);
          const bHot =
            b.vote_score / Math.pow(bAge / (1000 * 60 * 60) + 2, 1.5);
          return bHot - aHot;
      }
    });
    // Apply pagination
    const paginatedPosts = filtered.slice(skip, skip + limit);
    const total = filtered.length;
    // Transform to DTO format
    const data = await ArrayUtil.asyncMap(paginatedPosts, async (item) => {
      const post = item.post;
      return {
        id: post.id as string & tags.Format<"uuid">,
        title: post.title,
        author: await RedditCommunityMemberAtSummaryTransformer.transform(
          post.author,
        ),
        community: await RedditCommunityCommunityAtSummaryTransformer.transform(
          post.community,
        ),
        vote_score: item.vote_score as number & tags.Type<"int32">,
        comments_count: post.comments.filter((c) => c.deleted_at === null)
          .length as number & tags.Type<"int32">,
        created_at: post.created_at.toISOString() as string &
          tags.Format<"date-time">,
        post_type: post.post_type,
        text_preview:
          post.post_type === "text" && post.text_content
            ? post.text_content.slice(0, 200)
            : null,
        link_domain:
          post.post_type === "link" && post.link_url
            ? new URL(post.link_url).hostname
            : null,
        image_thumbnail:
          post.post_type === "image" ? (post.image_path ?? null) : null,
      } satisfies IRedditCommunityPost.ISummary;
    });
    return {
      data,
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    };
  } else {
    // Simple case: new sort without score-based filtering
    const posts = await MyGlobal.prisma.reddit_community_posts.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...RedditCommunityPostAtSummaryTransformer.select(),
    });
    const total = await MyGlobal.prisma.reddit_community_posts.count({
      where: whereInput,
    });
    return {
      data: await ArrayUtil.asyncMap(
        posts,
        RedditCommunityPostAtSummaryTransformer.transform,
      ),
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    };
  }
}
