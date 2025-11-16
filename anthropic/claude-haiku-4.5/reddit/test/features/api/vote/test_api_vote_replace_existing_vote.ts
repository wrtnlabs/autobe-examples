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
 * Test vote replacement behavior when a member changes their vote on the same
 * content.
 *
 * This test validates that the voting system correctly implements vote
 * replacement:
 *
 * - A member creates an initial upvote on a post
 * - The member then changes their vote to a downvote
 * - The system replaces the existing vote rather than creating a duplicate
 * - The vote_type is updated to the new value
 * - The updated_at timestamp is refreshed
 *
 * The system maintains a single vote per member per content, enforcing proper
 * vote constraints and preventing duplicate votes from the same member.
 *
 * Setup steps:
 *
 * 1. Create administrator account for category setup
 * 2. Create category for community organization
 * 3. Create member account for posting and voting
 * 4. Create community within the category
 * 5. Create post within the community
 * 6. Cast initial upvote on the post
 * 7. Change vote to downvote on the same post
 * 8. Verify vote replacement behavior
 */
export async function test_api_vote_replace_existing_vote(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create category for community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(10),
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for voting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: memberPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post for voting
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Cast initial upvote on the post
  const firstVote = await api.functional.communityPlatform.member.votes.create(
    connection,
    {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(firstVote);
  TestValidator.equals(
    "initial vote type is upvote",
    firstVote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "initial vote content_id matches post",
    firstVote.content_id,
    post.id,
  );
  TestValidator.equals(
    "initial vote content_type is post",
    firstVote.content_type,
    "post",
  );

  // Store the initial vote timestamp for comparison
  const initialVoteId = firstVote.id;
  const initialCreatedAt = firstVote.created_at;
  const initialUpdatedAt = firstVote.updated_at;

  // Small delay to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 7: Change vote to downvote on the same post
  const replacedVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(replacedVote);

  // Step 8: Verify vote replacement behavior
  TestValidator.equals(
    "replaced vote has same ID",
    replacedVote.id,
    initialVoteId,
  );
  TestValidator.equals(
    "replaced vote type is downvote",
    replacedVote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "replaced vote created_at is unchanged",
    replacedVote.created_at,
    initialCreatedAt,
  );
  TestValidator.notEquals(
    "replaced vote updated_at is refreshed",
    replacedVote.updated_at,
    initialUpdatedAt,
    (key) =>
      key === "created_at" ||
      key === "id" ||
      key === "content_type" ||
      key === "content_id",
  );
  TestValidator.equals(
    "replaced vote content matches original",
    replacedVote.content_id,
    post.id,
  );
  TestValidator.equals(
    "replaced vote content_type is still post",
    replacedVote.content_type,
    "post",
  );
}
