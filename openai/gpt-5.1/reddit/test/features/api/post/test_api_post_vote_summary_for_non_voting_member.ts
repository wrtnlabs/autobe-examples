import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformPostVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteSummary";

/**
 * Validate vote summary for a non-voting member user.
 *
 * Business flow:
 *
 * 1. User A joins as a member user (auth.memberUser.join).
 * 2. As User A, create a community.
 * 3. As User A, create a post in that community.
 * 4. As User A, cast an upvote on the post.
 * 5. User B joins as a different member user (auth.memberUser.join), which
 *    switches the SDK authentication context to User B.
 * 6. As User B, query the vote summary for the same post via
 *    communityPlatform.memberUser.posts.votes.index.
 * 7. Assert that aggregate counts (upvote_count/downvote_count/score) reflect the
 *    existing vote from User A while current_member_vote indicates that User B
 *    has not voted yet (null or "none").
 */
export async function test_api_post_vote_summary_for_non_voting_member(
  connection: api.IConnection,
) {
  // 1. User A joins
  const userAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const userA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: userAJoinBody,
    });
  typia.assert(userA);

  // 2. As User A, create a community
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. As User A, create a post in that community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 6 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 4. As User A, cast an upvote on the post
  const voteBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const vote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: voteBody,
      },
    );
  typia.assert(vote);

  TestValidator.equals(
    "vote is associated with correct post and member A",
    vote.post_id,
    post.id,
  );

  // 5. User B joins and becomes the current authenticated member user
  const userBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const userB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: userBJoinBody,
    });
  typia.assert(userB);

  // 6. As User B, query vote summary for the same post
  const summary: ICommunityPlatformPostVoteSummary =
    await api.functional.communityPlatform.memberUser.posts.votes.index(
      connection,
      {
        postId: post.id,
      },
    );
  typia.assert(summary);

  // 7. Validate aggregate counts and current_member_vote
  TestValidator.equals(
    "summary.post_id should match target post",
    summary.post_id,
    post.id,
  );

  TestValidator.equals(
    "upvote_count should reflect one upvote from User A",
    summary.upvote_count,
    1,
  );

  TestValidator.equals(
    "downvote_count should be zero",
    summary.downvote_count,
    0,
  );

  TestValidator.equals(
    "score should be upvotes minus downvotes (1)",
    summary.score,
    1,
  );

  // current_member_vote should indicate that User B has not voted
  TestValidator.predicate(
    "current_member_vote should be null or 'none' for non-voting member",
    summary.current_member_vote === null ||
      summary.current_member_vote === undefined ||
      summary.current_member_vote === "none",
  );
}
