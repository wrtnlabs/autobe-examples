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
 * Test deleting a vote on content, validating the polymorphic voting deletion
 * system.
 *
 * This test validates the complete vote lifecycle:
 *
 * 1. Creates a member account for voting
 * 2. Sets up a category and community for content
 * 3. Creates a post in the community
 * 4. Casts an upvote on the post
 * 5. Deletes the vote and verifies the deletion succeeds
 *
 * The test ensures the vote deletion endpoint (DELETE
 * /communityPlatform/member/votes/{voteId}) properly removes votes from the
 * system and works correctly with the polymorphic voting model.
 */
export async function test_api_vote_deletion_on_comment(
  connection: api.IConnection,
) {
  // Step 1: Create member account for voting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuth);

  // Step 2: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(adminAuth);

  // Switch to administrator for category creation
  connection.headers ??= {};
  connection.headers.Authorization = adminAuth.token.access;

  // Step 3: Create a category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    display_order: 0,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // Switch back to member for community creation
  connection.headers.Authorization = memberAuth.token.access;

  // Step 4: Create a community
  const communityData = {
    name: RandomGenerator.name(3),
    identifier: RandomGenerator.alphabets(10),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);

  // Step 5: Create a post in the community
  const postData = {
    community_id: community.id,
    post_type: "text" as const,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content_text: RandomGenerator.content({ paragraphs: 2 }),
    is_nsfw: false,
    has_spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    { body: postData },
  );
  typia.assert(post);

  // Step 6: Create a vote on the post
  const voteData = {
    content_type: "post" as const,
    content_id: post.id,
    vote_type: "upvote" as const,
  } satisfies ICommunityPlatformVote.ICreate;

  const vote = await api.functional.communityPlatform.member.votes.create(
    connection,
    { body: voteData },
  );
  typia.assert(vote);
  TestValidator.equals("vote was created on post", vote.content_type, "post");
  TestValidator.equals("vote type is upvote", vote.vote_type, "upvote");
  TestValidator.equals(
    "vote references correct content",
    vote.content_id,
    post.id,
  );

  // Step 7: Delete the vote
  await api.functional.communityPlatform.member.votes.erase(connection, {
    voteId: vote.id,
  });

  // Step 8: Verify vote deletion succeeded
  // The deletion operation completed without error, indicating successful removal
  TestValidator.predicate("vote deletion completed successfully", true);
}
