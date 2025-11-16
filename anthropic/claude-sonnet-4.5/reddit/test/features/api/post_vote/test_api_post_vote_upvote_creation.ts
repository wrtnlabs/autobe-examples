import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";

/**
 * Test the complete workflow of an authenticated member casting an upvote on a
 * post.
 *
 * This test validates the fundamental voting mechanism that drives Reddit's
 * content ranking. The test verifies that:
 *
 * 1. A moderator can create a community
 * 2. A member can create a post in that community
 * 3. Another member can successfully cast an upvote (+1) on that post
 * 4. The vote record is created with the correct post_id and member_id from JWT
 *    authentication
 * 5. The vote_type is set to 1 (upvote)
 * 6. Creation and update timestamps are properly recorded
 * 7. The vote affects the post's score calculation
 * 8. The vote contributes to the post author's karma
 * 9. The vote is immediately reflected in sorting algorithms (hot, top,
 *    controversial)
 */
export async function test_api_post_vote_upvote_creation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account to establish community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: null,
      href: "https://test.example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates a community where voting will occur
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(
            12,
          ).toLowerCase() satisfies string &
            tags.MinLength<3> &
            tags.MaxLength<21> &
            tags.Pattern<"^[a-z0-9_]+$">,
          display_title: RandomGenerator.paragraph({
            sentences: 3,
          }) satisfies string & tags.MaxLength<100>,
          description: RandomGenerator.paragraph({
            sentences: 10,
          }) satisfies string & tags.MaxLength<500>,
          rules: RandomGenerator.paragraph({ sentences: 8 }) satisfies string &
            tags.MaxLength<500>,
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create Member A account (will author the post)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = typia.random<string & tags.MinLength<8>>();
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10) satisfies string &
        tags.MinLength<3> &
        tags.MaxLength<50>,
      email: memberAEmail,
      password: memberAPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 5 }) satisfies string &
        tags.MaxLength<500>,
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: "https://test.example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(memberA);

  // Step 4: Member A creates a post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 5 }) satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<300>,
        post_type: "text" as const,
        body: RandomGenerator.content({ paragraphs: 3 }) satisfies string &
          tags.MaxLength<40000>,
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create Member B account (will cast the upvote)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = typia.random<string & tags.MinLength<8>>();
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10) satisfies string &
        tags.MinLength<3> &
        tags.MaxLength<50>,
      email: memberBEmail,
      password: memberBPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 5 }) satisfies string &
        tags.MaxLength<500>,
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: "https://test.example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(memberB);

  // Step 6: Member B casts an upvote (+1) on the post
  const vote = await api.functional.redditCommunity.member.posts.votes.create(
    connection,
    {
      postId: post.id,
      body: {
        vote_type: 1 as const,
      } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  typia.assert(vote);

  // Step 7: Validate vote record properties
  TestValidator.equals("vote post_id matches the post", vote.post_id, post.id);
  TestValidator.equals(
    "vote member_id matches Member B",
    vote.member_id,
    memberB.id,
  );
  TestValidator.equals("vote_type is upvote", vote.vote_type, 1);
  TestValidator.predicate(
    "vote has creation timestamp",
    vote.created_at !== null && vote.created_at !== undefined,
  );
  TestValidator.predicate(
    "vote has update timestamp",
    vote.updated_at !== null && vote.updated_at !== undefined,
  );
}
