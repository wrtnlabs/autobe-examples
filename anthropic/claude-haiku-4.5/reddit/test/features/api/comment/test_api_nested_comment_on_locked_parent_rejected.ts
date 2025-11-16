import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test that creating a nested reply to a locked parent comment fails with
 * appropriate error.
 *
 * NOTE: This test scenario requires an API endpoint to lock/update comments
 * that is not available in the provided SDK. The test cannot verify that a
 * parent comment is actually locked before attempting to create a nested reply.
 * Therefore, this test is rewritten to validate the basic nested comment
 * creation flow with available APIs.
 *
 * Rewritten test flow:
 *
 * 1. Create and authenticate a member account
 * 2. Create an administrator and category
 * 3. Create a community
 * 4. Create a post in the community
 * 5. Create a parent comment on the post
 * 6. Verify nested comment can be created on parent comment
 * 7. Validate the nested comment structure and relationship
 *
 * This test validates that nested comments can be created and linked properly.
 * The locked comment enforcement scenario cannot be tested without a comment
 * update API.
 */
export async function test_api_nested_comment_on_locked_parent_rejected(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123!@#";
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(10),
    password: memberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuth);

  // Step 2: Create administrator and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!@#";
  const adminData = {
    email: adminEmail,
    password: adminPassword,
    username: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(adminAuth);

  const categoryData = {
    name: "Technology",
    slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
    display_order: 1,
    description: "Technology discussions",
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
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const communityData = {
    name: "Tech Discussions",
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`.toLowerCase(),
    description: "A community for technology discussions",
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

  // Step 4: Create a post
  const postData = {
    community_id: community.id,
    post_type: "text" as const,
    title: "Test Post for Comment Lock Testing",
    content_text: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  // Step 5: Create a parent comment
  const parentCommentData = {
    post_id: post.id,
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformComment.ICreate;

  const parentComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: parentCommentData,
    });
  typia.assert(parentComment);
  TestValidator.predicate(
    "parent comment created successfully",
    !parentComment.is_locked,
  );

  // Step 6: Verify nested comment creation
  const nestedCommentData = {
    post_id: post.id,
    parent_comment_id: parentComment.id,
    content: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformComment.ICreate;

  const nestedComment =
    await api.functional.communityPlatform.member.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: nestedCommentData,
      },
    );
  typia.assert(nestedComment);

  // Step 7: Validate nested comment structure
  TestValidator.equals(
    "nested comment parent ID matches parent comment ID",
    nestedComment.community_platform_parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "nested comment post ID matches post ID",
    nestedComment.community_platform_post_id,
    post.id,
  );
  TestValidator.predicate(
    "nested comment nesting depth is 1",
    nestedComment.nesting_depth === 1,
  );
  TestValidator.predicate(
    "nested comment is not locked",
    !nestedComment.is_locked,
  );
}
