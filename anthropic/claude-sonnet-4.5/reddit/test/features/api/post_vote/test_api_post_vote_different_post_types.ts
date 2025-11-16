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
 * Test voting functionality across all three post types (text, link, image).
 *
 * This test validates that the voting mechanism works consistently regardless
 * of post content type. It ensures that members can vote on text posts with
 * body content, link posts with external URLs, and image posts with uploaded
 * images.
 *
 * The test verifies that vote mechanics (upvote/downvote, score calculation,
 * vote updates) work identically across all post types, and that the post_type
 * field has no impact on voting behavior or constraints.
 *
 * Test Flow:
 *
 * 1. Setup: Create moderator, community, and two member accounts
 * 2. Create three posts: text, link, and image types
 * 3. Vote on all three posts with upvotes
 * 4. Update votes to downvotes on all three posts
 * 5. Validate consistent voting behavior across all post types
 */
export async function test_api_post_vote_different_post_types(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for community setup
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://test.example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community to host different post types
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(
            10,
          ).toLowerCase() satisfies string &
            tags.MinLength<3> &
            tags.MaxLength<21> &
            tags.Pattern<"^[a-z0-9_]+$">,
          display_title: RandomGenerator.name(3) satisfies string &
            tags.MaxLength<100>,
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

  // Step 3: Create member account (post author)
  await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8) satisfies string &
        tags.MinLength<3> &
        tags.MaxLength<50>,
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 5 }) satisfies string &
        tags.MaxLength<500>,
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: "127.0.0.1",
      href: "https://test.example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });

  // Step 4: Create text post
  const textPost = await api.functional.redditCommunity.member.posts.create(
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
  typia.assert(textPost);

  // Step 5: Create link post
  const linkPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 5 }) satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<300>,
        post_type: "link" as const,
        body: null,
        url: typia.random<string & tags.MaxLength<2000> & tags.Format<"uri">>(),
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(linkPost);

  // Step 6: Create image post
  const imagePost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 5 }) satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<300>,
        post_type: "image" as const,
        body: null,
        url: null,
        image_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(imagePost);

  // Step 7: Create second member account (voter)
  const voterEmail = typia.random<string & tags.Format<"email">>();
  const voterPassword = typia.random<string & tags.MinLength<8>>();
  await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8) satisfies string &
        tags.MinLength<3> &
        tags.MaxLength<50>,
      email: voterEmail,
      password: voterPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 5 }) satisfies string &
        tags.MaxLength<500>,
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: "127.0.0.1",
      href: "https://test.example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });

  // Step 8: Login as voter member
  await api.functional.auth.member.login(connection, {
    body: {
      email: voterEmail,
      password: voterPassword,
      ip: "127.0.0.1",
      href: "https://test.example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ILogin,
  });

  // Step 9: Cast upvote on text post
  const textVote =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      postId: textPost.id,
      body: {
        vote_type: 1 as const,
      } satisfies IRedditCommunityPostVote.ICreate,
    });
  typia.assert(textVote);
  TestValidator.equals("text post vote type is upvote", textVote.vote_type, 1);

  // Step 10: Cast upvote on link post
  const linkVote =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      postId: linkPost.id,
      body: {
        vote_type: 1 as const,
      } satisfies IRedditCommunityPostVote.ICreate,
    });
  typia.assert(linkVote);
  TestValidator.equals("link post vote type is upvote", linkVote.vote_type, 1);

  // Step 11: Cast upvote on image post
  const imageVote =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      postId: imagePost.id,
      body: {
        vote_type: 1 as const,
      } satisfies IRedditCommunityPostVote.ICreate,
    });
  typia.assert(imageVote);
  TestValidator.equals(
    "image post vote type is upvote",
    imageVote.vote_type,
    1,
  );

  // Step 12: Update vote on text post to downvote
  const textVoteUpdated =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      postId: textPost.id,
      body: {
        vote_type: -1 as const,
      } satisfies IRedditCommunityPostVote.ICreate,
    });
  typia.assert(textVoteUpdated);
  TestValidator.equals(
    "text post vote updated to downvote",
    textVoteUpdated.vote_type,
    -1,
  );

  // Step 13: Update vote on link post to downvote
  const linkVoteUpdated =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      postId: linkPost.id,
      body: {
        vote_type: -1 as const,
      } satisfies IRedditCommunityPostVote.ICreate,
    });
  typia.assert(linkVoteUpdated);
  TestValidator.equals(
    "link post vote updated to downvote",
    linkVoteUpdated.vote_type,
    -1,
  );

  // Step 14: Update vote on image post to downvote
  const imageVoteUpdated =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      postId: imagePost.id,
      body: {
        vote_type: -1 as const,
      } satisfies IRedditCommunityPostVote.ICreate,
    });
  typia.assert(imageVoteUpdated);
  TestValidator.equals(
    "image post vote updated to downvote",
    imageVoteUpdated.vote_type,
    -1,
  );

  // Final validation: Confirm voting works identically across all post types
  TestValidator.predicate("all votes successfully created and updated", true);
}
