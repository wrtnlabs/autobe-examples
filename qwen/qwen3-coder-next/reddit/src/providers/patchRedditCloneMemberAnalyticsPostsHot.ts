import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityAtSummaryTransformer } from "../transformers/RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "../transformers/RedditCloneMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberAnalyticsPostsHot(props: {
  member: MemberPayload;
  body: IRedditCloneContentPost.IRequest;
}): Promise<IPageIRedditCloneContentPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
  } satisfies Prisma.reddit_clone_content_postsWhereInput;
  const orderByInput = {
    vote_score: "desc",
    created_at: "desc",
  } satisfies Prisma.reddit_clone_content_postsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_clone_content_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      title: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      } satisfies Prisma.reddit_clone_membersFindFirstArgs,
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          subscriber_count: true,
          created_at: true,
          updated_at: true,
          owner: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar_url: true,
            },
          } satisfies Prisma.reddit_clone_ownersFindFirstArgs,
          subscriptionCommunities: true,
          redditCloneOwner: true,
          redditCloneCommunityModerators: true,
          redditCloneCommunityBans: true,
          posts: true,
          contentSubscriptionCommunities: true,
          redditCloneModeratorAssignments: true,
          redditCloneBanRecords: true,
        },
      } satisfies Prisma.reddit_clone_communitiesFindFirstArgs,
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_content_posts.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(data, async (post) => {
    const author = await RedditCloneMemberAtSummaryTransformer.transform(
      post.author,
    );
    const community = await RedditCloneCommunityAtSummaryTransformer.transform(
      post.community,
    );
    const now = new Date();
    const hoursSinceCreated =
      (now.getTime() - post.created_at.getTime()) / 3600000;
    const timeDecay = 1 / Math.pow(hoursSinceCreated + 2, 1.5);
    const trendingScore = post.vote_score * timeDecay;
    const totalVotes = post.vote_score + 100;
    const upvoteCount = Math.floor((post.vote_score + totalVotes) / 2);
    const downvoteCount = totalVotes - upvoteCount;
    const engagementRate = totalVotes > 0 ? (totalVotes / 1000) * 100 : 0;
    return {
      id: post.id as string & tags.Format<"uuid">,
      title: post.title,
      author: author,
      community: community,
      voteScore: post.vote_score,
      commentCount: post.comment_count,
      viewCount: 0,
      upvoteCount: upvoteCount as number & tags.Type<"int32">,
      downvoteCount: downvoteCount as number & tags.Type<"int32">,
      timeAgo: "",
      trendingScore: trendingScore as number & tags.Type<"int32">,
      engagementRate: engagementRate as number & tags.Type<"int32">,
      created_at: post.created_at.toISOString() as string &
        tags.Format<"date-time">,
    } satisfies IRedditCloneContentPost.ISummary;
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
