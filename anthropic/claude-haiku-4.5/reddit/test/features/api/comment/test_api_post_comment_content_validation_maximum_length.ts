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
 * Test comment creation with maximum valid content length (10,000 characters).
 *
 * This test validates that the comment API properly enforces the maxLength
 * constraint on the content field by testing both valid comments at the maximum
 * limit and invalid comments exceeding the limit.
 *
 * Test flow:
 *
 * 1. Create an authenticated member account
 * 2. Create an administrator account
 * 3. Create a category for the community
 * 4. Create a community in that category
 * 5. Create a post in the community
 * 6. Test successful comment creation with exactly 10,000 characters
 * 7. Verify comment contains the full 10,000 character content
 * 8. Test boundary condition: attempt comment with 10,001 characters
 * 9. Verify API rejects oversized comment
 */
export async function test_api_post_comment_content_validation_maximum_length(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "ValidPassword123";
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123";
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 3: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch back to member for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(3),
        content_text: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6 & 7: Test successful comment creation with exactly 10,000 characters
  const maxValidContent = RandomGenerator.alphabets(10000);
  TestValidator.predicate(
    "content length should be exactly 10000 characters",
    maxValidContent.length === 10000,
  );

  const validComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          content: maxValidContent,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(validComment);
  TestValidator.equals(
    "comment content should match the 10000 character input",
    validComment.content,
    maxValidContent,
  );
  TestValidator.equals(
    "comment content length should be 10000",
    validComment.content.length,
    10000,
  );

  // Step 8 & 9: Test boundary condition - attempt comment with 10,001 characters
  const oversizedContent = RandomGenerator.alphabets(10001);
  TestValidator.predicate(
    "oversized content length should be 10001 characters",
    oversizedContent.length === 10001,
  );

  await TestValidator.error(
    "API should reject comment with 10001 character content",
    async () => {
      await api.functional.communityPlatform.member.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            content: oversizedContent,
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );
}
