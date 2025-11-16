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
 * Test updating a vote to the same vote_type (no-op update).
 *
 * This test validates that updating a vote to the same vote_type (e.g., upvote
 * to upvote) succeeds with HTTP 200 and refreshes the updated_at timestamp
 * while maintaining the same vote_type. This ensures the system handles
 * redundant vote updates gracefully.
 *
 * Test flow:
 *
 * 1. Create member account and authenticate
 * 2. Create administrator and category for community organization
 * 3. Create community in the category
 * 4. Create post within the community
 * 5. Create initial upvote on the post
 * 6. Update the vote to the same vote_type ('upvote')
 * 7. Verify the update succeeds with vote_type unchanged
 * 8. Confirm updated_at timestamp is refreshed
 */
export async function test_api_vote_update_same_vote_type(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123!@#";
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(10),
    password: memberPassword,
    href: "http://localhost/register",
    referrer: "http://localhost/",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuth);
  TestValidator.predicate(
    "member authenticated",
    memberAuth.token.access !== null,
  );

  // Step 2: Create administrator and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!@#";
  const adminData = {
    email: adminEmail,
    password: adminPassword,
    username: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    href: "http://localhost/admin",
    referrer: "http://localhost/",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(adminAuth);

  // Create category
  const categoryData = {
    name: "Technology",
    slug: "technology",
    description: "Tech discussions",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Switch back to member and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost/login",
      referrer: "http://localhost/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphabets(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 4: Create post in the community
  const postData = {
    community_id: community.id,
    post_type: "text" as const,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content_text: RandomGenerator.content({ paragraphs: 2 }),
    is_nsfw: false,
    has_spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  // Step 5: Create initial upvote on the post
  const voteData = {
    content_type: "post" as const,
    content_id: post.id,
    vote_type: "upvote" as const,
  } satisfies ICommunityPlatformVote.ICreate;

  const initialVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: voteData,
    });
  typia.assert(initialVote);
  TestValidator.equals(
    "initial vote type is upvote",
    initialVote.vote_type,
    "upvote",
  );

  // Store the initial timestamp
  const initialUpdatedAt = initialVote.updated_at;

  // Wait a small amount of time to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 6: Update the vote to the same vote_type (upvote to upvote)
  const updateData = {
    vote_type: "upvote" as const,
  } satisfies ICommunityPlatformVote.IUpdate;

  const updatedVote =
    await api.functional.communityPlatform.member.votes.update(connection, {
      voteId: initialVote.id,
      body: updateData,
    });
  typia.assert(updatedVote);

  // Step 7: Verify the update succeeded and vote_type is unchanged
  TestValidator.equals(
    "updated vote type is still upvote",
    updatedVote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "vote ID remains the same",
    updatedVote.id,
    initialVote.id,
  );

  // Step 8: Verify updated_at timestamp is refreshed
  TestValidator.predicate(
    "updated_at timestamp is refreshed after update",
    updatedVote.updated_at !== initialUpdatedAt,
  );
}
