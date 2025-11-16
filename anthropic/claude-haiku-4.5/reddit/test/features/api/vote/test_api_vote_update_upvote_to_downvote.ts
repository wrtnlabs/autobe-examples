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
 * Validate updating an existing upvote to a downvote on a post.
 *
 * This test verifies the complete vote modification workflow:
 *
 * 1. Create member account and authenticate
 * 2. Create administrator and category for community setup
 * 3. Create a community for hosting the post
 * 4. Create a post in the community
 * 5. Cast an initial upvote on the post
 * 6. Update the vote from upvote to downvote
 * 7. Verify vote_type changed to 'downvote' and updated_at timestamp is refreshed
 */
export async function test_api_vote_update_upvote_to_downvote(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "TestPassword123!",
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000",
  };

  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAuth);

  // Step 2: Create administrator and category
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!",
    username: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin/join",
    referrer: "http://localhost:3000",
  };

  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAuth);

  // Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Switch back to member and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberData.email,
      password: memberData.password,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `comm-${RandomGenerator.alphaNumeric(8)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Cast an initial upvote on the post
  const initialVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(initialVote);
  TestValidator.equals(
    "initial vote type is upvote",
    initialVote.vote_type,
    "upvote",
  );

  const initialUpdatedAt = initialVote.updated_at;

  // Step 6: Update the vote from upvote to downvote
  const updatedVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.update(connection, {
      voteId: initialVote.id,
      body: {
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.IUpdate,
    });
  typia.assert(updatedVote);

  // Step 7: Verify vote changes
  TestValidator.equals(
    "vote type changed to downvote",
    updatedVote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "vote ID remains the same",
    updatedVote.id,
    initialVote.id,
  );
  TestValidator.predicate("updated_at timestamp is refreshed", () => {
    if (initialUpdatedAt === null || initialUpdatedAt === undefined)
      return true;
    if (updatedVote.updated_at === null || updatedVote.updated_at === undefined)
      return false;
    return updatedVote.updated_at !== initialUpdatedAt;
  });
}
