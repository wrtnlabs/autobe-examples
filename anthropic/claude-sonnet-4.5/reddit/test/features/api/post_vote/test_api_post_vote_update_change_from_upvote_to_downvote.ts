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
 * Test the vote update mechanism where a member changes their existing upvote
 * to a downvote.
 *
 * This test validates the idempotent vote operation that handles both creation
 * and updates. The workflow includes:
 *
 * 1. Setting up moderator and community
 * 2. Creating post author member and post
 * 3. Creating voter member account
 * 4. First vote: casting an upvote (+1)
 * 5. Second vote: changing to downvote (-1)
 * 6. Verifying vote record is updated (not duplicated)
 * 7. Verifying timestamps: updated_at changed, created_at unchanged
 * 8. Verifying unique constraint: only one vote per member per post
 */
export async function test_api_post_vote_update_change_from_upvote_to_downvote(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        nickname: RandomGenerator.name(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates a community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account to author the post
  const postAuthorEmail = typia.random<string & tags.Format<"email">>();
  const postAuthor: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: postAuthorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: true,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(postAuthor);

  // Step 4: Post author creates a post
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text" as const,
        body: RandomGenerator.content({ paragraphs: 3 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create voter member account
  const voterEmail = typia.random<string & tags.Format<"email">>();
  const voter: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: voterEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
        show_online_status: undefined,
        show_subscribed_communities: undefined,
        show_activity_feed: undefined,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(voter);

  // Step 6: Voter casts an upvote (+1)
  const upvote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      postId: post.id,
      body: {
        vote_type: 1,
      } satisfies IRedditCommunityPostVote.ICreate,
    });
  typia.assert(upvote);

  // Verify upvote properties
  TestValidator.equals("upvote post_id matches", upvote.post_id, post.id);
  TestValidator.equals("upvote member_id matches", upvote.member_id, voter.id);
  TestValidator.equals("upvote vote_type is 1", upvote.vote_type, 1);

  // Store original timestamps
  const originalCreatedAt = upvote.created_at;
  const originalUpdatedAt = upvote.updated_at;

  // Step 7: Voter changes vote to downvote (-1)
  const downvote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      postId: post.id,
      body: {
        vote_type: -1,
      } satisfies IRedditCommunityPostVote.ICreate,
    });
  typia.assert(downvote);

  // Step 8: Verify that the vote record was updated (same ID)
  TestValidator.equals(
    "vote ID unchanged - same record updated",
    downvote.id,
    upvote.id,
  );

  // Step 9: Verify vote_type changed from 1 to -1
  TestValidator.equals("vote_type changed to -1", downvote.vote_type, -1);

  // Verify other properties remain the same
  TestValidator.equals("post_id unchanged", downvote.post_id, post.id);
  TestValidator.equals("member_id unchanged", downvote.member_id, voter.id);

  // Step 10: Verify timestamps - created_at unchanged, updated_at changed
  TestValidator.equals(
    "created_at unchanged",
    downvote.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at has been modified",
    new Date(downvote.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );

  // Step 11: Verify unique constraint - only one vote exists per member per post
  TestValidator.predicate(
    "only one vote record exists per member per post",
    downvote.id === upvote.id,
  );
}
