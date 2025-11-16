import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Validate vote type preservation in retrieval.
 *
 * This test ensures that when votes are created and then retrieved, the
 * vote_type field accurately reflects whether the vote was an upvote or
 * downvote. This is critical for the voting system to properly track user
 * preferences and maintain the integrity of content ranking based on vote
 * direction.
 *
 * Test flow:
 *
 * 1. Set up platform with administrator and category
 * 2. Create a member for voting
 * 3. Create a community and two posts
 * 4. Cast an upvote on the first post
 * 5. Cast a downvote on the second post
 * 6. Retrieve each vote and verify the vote_type is correctly preserved
 */
export async function test_api_vote_retrieval_upvote_vs_downvote(
  connection: api.IConnection,
) {
  // Setup: Create administrator account
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Create member account for voting
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create first post for upvote
  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(),
        content_text: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post1);

  // Create second post for downvote
  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(),
        content_text: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);

  // Cast upvote on first post
  const upvote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post1.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(upvote);

  // Cast downvote on second post
  const downvote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post2.id,
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(downvote);

  // Retrieve upvote and verify vote_type
  const retrievedUpvote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.at(connection, {
      voteId: upvote.id,
    });
  typia.assert(retrievedUpvote);

  TestValidator.equals(
    "upvote vote_type preserved",
    retrievedUpvote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "upvote content matches",
    retrievedUpvote.content_id,
    post1.id,
  );

  // Retrieve downvote and verify vote_type
  const retrievedDownvote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.at(connection, {
      voteId: downvote.id,
    });
  typia.assert(retrievedDownvote);

  TestValidator.equals(
    "downvote vote_type preserved",
    retrievedDownvote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "downvote content matches",
    retrievedDownvote.content_id,
    post2.id,
  );

  // Verify the two votes are different types
  TestValidator.notEquals(
    "upvote and downvote are different types",
    retrievedUpvote.vote_type,
    retrievedDownvote.vote_type,
  );
}
