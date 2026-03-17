import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommentVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteSnapshot";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_comments_votes_create } from "../../../generate/generate_random_community_platform_member_comments_votes_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_statistics_multiple_votes(
  connection: api.IConnection,
): Promise<void> {
  // Setup three separate member connections for voting
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {});
  typia.assert(member3);
  // Member 1 creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // All three members subscribe to the community
  const subscription1 =
    await generate_random_community_platform_member_subscriptions_create(
      member1Connection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription1);
  const subscription2 =
    await generate_random_community_platform_member_subscriptions_create(
      member2Connection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription2);
  const subscription3 =
    await generate_random_community_platform_member_subscriptions_create(
      member3Connection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription3);
  // Member 1 creates a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    member1Connection,
    {
      body: { community_name: community.name },
    },
  );
  typia.assert(post);
  // Member 1 creates a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      member1Connection,
      {
        body: { content: RandomGenerator.paragraph({ sentences: 2 }) },
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // Member 2 upvotes the comment
  const vote1 =
    await generate_random_community_platform_member_comments_votes_create(
      member2Connection,
      {
        body: { type: "upvote" },
        params: { commentId: comment.id },
      },
    );
  typia.assert(vote1);
  // Member 3 upvotes the comment
  const vote2 =
    await generate_random_community_platform_member_comments_votes_create(
      member3Connection,
      {
        body: { type: "upvote" },
        params: { commentId: comment.id },
      },
    );
  typia.assert(vote2);
  // Member 1 downvotes the comment
  const vote3 =
    await generate_random_community_platform_member_comments_votes_create(
      member1Connection,
      {
        body: { type: "downvote" },
        params: { commentId: comment.id },
      },
    );
  typia.assert(vote3);
  // Now call the statistics endpoint with default pagination
  const statistics = await api.functional.communityPlatform.comments.statistics(
    connection,
    {
      commentId: comment.id,
      body: {} satisfies ICommunityPlatformCommentVoteSnapshot.IRequest,
    },
  );
  typia.assert(statistics);
  // Validate the response
  TestValidator.equals(
    "pagination total records should be 3",
    statistics.pagination.records,
    3,
  );
  TestValidator.equals(
    "should have three vote snapshots",
    statistics.data.length,
    3,
  );
  // Verify the vote types are present
  const voteTypes = statistics.data.map((snapshot) => snapshot.vote_type);
  TestValidator.predicate(
    "should contain upvote and downvote types",
    voteTypes.includes("upvote") && voteTypes.includes("downvote"),
  );
  // Verify member contexts
  const memberIds = statistics.data.map((snapshot) => snapshot.member.id);
  TestValidator.predicate(
    "should contain all three member IDs",
    memberIds.includes(member1.id) &&
      memberIds.includes(member2.id) &&
      memberIds.includes(member3.id),
  );
  // Validate timestamp ordering (most recent first)
  const timestamps = statistics.data.map((snapshot) => snapshot.created_at);
  for (let i = 0; i < timestamps.length - 1; i++) {
    TestValidator.predicate(
      `timestamp ${i} should be >= timestamp ${i + 1}`,
      new Date(timestamps[i]) >= new Date(timestamps[i + 1]),
    );
  }
}
