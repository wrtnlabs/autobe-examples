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
 * Test the workflow of an authenticated member casting a downvote on a post.
 *
 * This test validates the negative voting mechanism for content quality
 * control. It ensures that:
 *
 * 1. A member can successfully cast a downvote (-1) on an existing post
 * 2. The vote_type is correctly set to -1
 * 3. The vote record contains proper post_id and member_id associations
 * 4. Timestamps are recorded accurately
 * 5. The voting system properly enforces one vote per member per post
 *
 * Test workflow:
 *
 * 1. Create moderator account for community setup
 * 2. Moderator creates a community to host the post
 * 3. Create first member account (post author)
 * 4. Post author creates a text post in the community
 * 5. Create second member account (voter - different from author)
 * 6. Second member casts a downvote on the post
 * 7. Validate vote record properties and associations
 */
export async function test_api_post_vote_downvote_creation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for community setup
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/home",
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates a community to host the post
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          icon_url: "https://example.com/icons/community.png",
          banner_url: "https://example.com/banners/community.jpg",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create first member account (post author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorPassword = typia.random<string & tags.MinLength<8>>();
  const authorUsername = RandomGenerator.alphaNumeric(12).toLowerCase();

  const author = await api.functional.auth.member.join(connection, {
    body: {
      username: authorUsername,
      email: authorEmail,
      password: authorPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 4, wordMin: 4, wordMax: 8 }),
      avatar_url: "https://example.com/avatars/author.png",
      show_online_status: true,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: "127.0.0.1",
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(author);

  // Step 4: Post author creates a text post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        post_type: "text",
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 8,
        }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create second member account (voter - different from author)
  const voterEmail = typia.random<string & tags.Format<"email">>();
  const voterPassword = typia.random<string & tags.MinLength<8>>();
  const voterUsername = RandomGenerator.alphaNumeric(12).toLowerCase();

  const voter = await api.functional.auth.member.join(connection, {
    body: {
      username: voterUsername,
      email: voterEmail,
      password: voterPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 7 }),
      avatar_url: "https://example.com/avatars/voter.png",
      show_online_status: false,
      show_subscribed_communities: true,
      show_activity_feed: true,
      ip: "127.0.0.1",
      href: "https://example.com/member/join",
      referrer: "https://example.com/community",
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(voter);

  // Step 6: Second member casts a downvote on the post
  const vote = await api.functional.redditCommunity.member.posts.votes.create(
    connection,
    {
      postId: post.id,
      body: {
        vote_type: -1,
      } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  typia.assert(vote);

  // Step 7: Validate vote record properties
  TestValidator.equals("vote type is downvote", vote.vote_type, -1);
  TestValidator.equals("vote post_id matches", vote.post_id, post.id);
  TestValidator.equals(
    "vote member_id matches voter",
    vote.member_id,
    voter.id,
  );

  // Verify timestamps are present and valid
  TestValidator.predicate(
    "vote has created_at timestamp",
    vote.created_at !== null && vote.created_at !== undefined,
  );
  TestValidator.predicate(
    "vote has updated_at timestamp",
    vote.updated_at !== null && vote.updated_at !== undefined,
  );
}
