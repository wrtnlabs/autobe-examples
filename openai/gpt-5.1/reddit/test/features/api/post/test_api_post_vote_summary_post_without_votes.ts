import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteSummary";

/**
 * Validate zero-vote summary behavior for a freshly created post.
 *
 * Business context: A member user can create communities and posts. Votes for
 * posts are stored in community_platform_post_votes, and the PATCH
 * /communityPlatform/memberUser/posts/{postId}/votes endpoint computes an
 * aggregated summary of all votes for a specific post, including the current
 * member user's own vote state.
 *
 * This test ensures that when a post has no votes at all, the vote summary
 * endpoint still succeeds and returns a coherent zero-state aggregate:
 *
 * - Upvote_count and downvote_count are 0
 * - Score is 0
 * - Current_member_vote indicates no vote for the requesting member
 * - Post_id matches the target post
 *
 * Scenario steps:
 *
 * 1. Register a new member user via the join API to obtain an authenticated
 *    memberUser session on the SDK connection.
 * 2. Create a new community as this member user using the community creation API.
 * 3. Create a new post within that community without recording any votes for it.
 * 4. Call PATCH /communityPlatform/memberUser/posts/{postId}/votes via the SDK
 *    vote summary function.
 * 5. Assert that the summary reports zero counts and neutral score, and that
 *    post_id matches, and current_member_vote reflects that the user has not
 *    voted.
 */
export async function test_api_post_vote_summary_post_without_votes(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) to authenticate the connection
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(member);

  // 2. Create a community as this member user
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a post in the community with no votes
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // Sanity check: post belongs to the created community
  TestValidator.equals(
    "post community matches created community",
    post.community_id,
    community.id,
  );

  // 4. Call vote summary endpoint for the post with no votes
  const summary: ICommunityPlatformPostVoteSummary =
    await api.functional.communityPlatform.memberUser.posts.votes.index(
      connection,
      {
        postId: post.id,
      },
    );
  typia.assert<ICommunityPlatformPostVoteSummary>(summary);

  // 5. Business assertions for zero-vote state
  TestValidator.equals(
    "summary post_id matches post id",
    summary.post_id,
    post.id,
  );

  TestValidator.equals(
    "upvote_count is zero when no votes exist",
    summary.upvote_count,
    0,
  );

  TestValidator.equals(
    "downvote_count is zero when no votes exist",
    summary.downvote_count,
    0,
  );

  TestValidator.equals(
    "score is zero when both upvote and downvote counts are zero",
    summary.score,
    0,
  );

  // current_member_vote should not indicate an upvote or downvote
  TestValidator.predicate(
    "current_member_vote indicates no vote (null, undefined, or 'none')",
    summary.current_member_vote === null ||
      summary.current_member_vote === undefined ||
      summary.current_member_vote === "none",
  );
}
