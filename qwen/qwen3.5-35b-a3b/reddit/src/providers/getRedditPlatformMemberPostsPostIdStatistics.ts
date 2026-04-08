import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostRecentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostRecentActivity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityAtSummaryTransformer } from "../transformers/RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "../transformers/RedditPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberPostsPostIdStatistics(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformPost.IStatistic> {
  const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_id: true,
      author_id: true,
      upvotes_count: true,
      downvotes_count: true,
      comment_count: true,
      created_at: true,
      updated_at: true,
    },
  });
  const [community, author] = await Promise.all([
    MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: { id: post.community_id },
      select: {
        id: true,
        name: true,
        description: true,
        icon_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: post.author_id },
      select: {
        id: true,
        email: true,
        password_hash: true,
        username: true,
        karma: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
  ]);
  const votes = await MyGlobal.prisma.reddit_platform_post_votes.findMany({
    where: {
      reddit_platform_post_id: post.id,
    },
  });
  const comments = await MyGlobal.prisma.reddit_platform_comments.findMany({
    where: {
      reddit_platform_post_id: post.id,
    },
  });
  const upvotes_count = votes.filter((v) => v.vote_type === "up").length;
  const downvotes_count = votes.filter((v) => v.vote_type === "down").length;
  const total_votes = upvotes_count + downvotes_count;
  const unique_voters_count = votes.filter((v) => v.vote_type !== null).length;
  const vote_ratio =
    total_votes === 0
      ? 0
      : Math.round((upvotes_count / total_votes) * 1000) / 1000;
  const root_comment_count = comments.filter(
    (c) => c.reddit_platform_comments_id === null,
  ).length;
  const reply_comment_count = comments.filter(
    (c) => c.reddit_platform_comments_id !== null,
  ).length;
  const topComment = comments
    .filter((c) => c.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  const votes_per_comment_ratio =
    post.comment_count === 0 ? 0 : total_votes / post.comment_count;
  const nowTimestampMs = 1712476800000;
  const oneDayAgoTimestampMs = nowTimestampMs - 24 * 60 * 60 * 1000;
  const sevenDaysAgoTimestampMs = nowTimestampMs - 7 * 24 * 60 * 60 * 1000;
  const postCreatedTimestampMs = new Date(post.created_at).getTime();
  const postAgeDays =
    (nowTimestampMs - postCreatedTimestampMs) / (1000 * 60 * 60 * 24);
  const comment_density =
    post.comment_count === 0 || postAgeDays <= 0
      ? 0
      : post.comment_count / postAgeDays;
  const oneDayAgoDate = new Date(oneDayAgoTimestampMs);
  const sevenDaysAgoDate = new Date(sevenDaysAgoTimestampMs);
  const recentComments24h = comments.filter(
    (c) => c.created_at.getTime() >= oneDayAgoTimestampMs,
  ).length;
  const recentVotes24h = votes.filter(
    (v) => v.created_at.getTime() >= oneDayAgoTimestampMs,
  ).length;
  const recentComments7d = comments.filter(
    (c) => c.created_at.getTime() >= sevenDaysAgoTimestampMs,
  ).length;
  const recentVotes7d = votes.filter(
    (v) => v.created_at.getTime() >= sevenDaysAgoTimestampMs,
  ).length;
  const engagement_velocity = (recentComments24h + recentVotes24h) / 24.0;
  const recent24hVoters = votes
    .filter(
      (v) =>
        v.created_at.getTime() >= oneDayAgoTimestampMs && v.vote_type !== null,
    )
    .map((v) => v.reddit_platform_member_id);
  const recent7dVoters = votes
    .filter(
      (v) =>
        v.created_at.getTime() >= sevenDaysAgoTimestampMs &&
        v.vote_type !== null,
    )
    .map((v) => v.reddit_platform_member_id);
  const unique24hVoterCount = new Set(recent24hVoters).size;
  const unique7dVoterCount = new Set(recent7dVoters).size;
  return {
    id: post.id,
    author: await RedditPlatformMemberAtSummaryTransformer.transform(
      author as any,
    ),
    community: await RedditPlatformCommunityAtSummaryTransformer.transform(
      community as any,
    ),
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    upvotes_count: post.upvotes_count,
    downvotes_count: post.downvotes_count,
    total_votes: total_votes,
    vote_ratio: vote_ratio,
    unique_voters_count: unique_voters_count,
    comment_count: post.comment_count,
    root_comment_count: root_comment_count,
    reply_comment_count: reply_comment_count,
    top_comment_id: topComment ? topComment.id : null,
    votes_per_comment_ratio: votes_per_comment_ratio,
    comment_density: comment_density,
    engagement_velocity: engagement_velocity,
    recent_activity_24h: {
      comment_count: recentComments24h,
      vote_count: recentVotes24h,
      unique_voters_count: unique24hVoterCount,
    } satisfies IRedditPlatformPostRecentActivity,
    recent_activity_7d: {
      comment_count: recentComments7d,
      vote_count: recentVotes7d,
      unique_voters_count: unique7dVoterCount,
    } satisfies IRedditPlatformPostRecentActivity,
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// import { IRedditPlatformPostRecentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostRecentActivity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformMemberPostsPostIdStatistics(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
// }): Promise<IRedditPlatformPost.IStatistic> {
//   return {
//     id: ...,
//     author: await RedditPlatformMemberAtSummaryTransformer.transform(...),
//     community: await RedditPlatformCommunityAtSummaryTransformer.transform(...),
//     created_at: ...,
//     updated_at: ...,
//     upvotes_count: ...,
//     downvotes_count: ...,
//     total_votes: ...,
//     vote_ratio: ...,
//     unique_voters_count: ...,
//     comment_count: ...,
//     root_comment_count: ...,
//     reply_comment_count: ...,
//     top_comment_id: ...,
//     votes_per_comment_ratio: ...,
//     comment_density: ...,
//     engagement_velocity: ...,
//     recent_activity_24h: ...,
//     recent_activity_7d: ...,
//   };
// }
// ```
//--------------------------------------------------------------