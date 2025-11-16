import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test post title validation during creation
 *
 * Validates that post titles are properly validated according to length
 * constraints (1-300 characters), that special characters and spaces are
 * accepted, HTML tags are stripped, and that the title field is required for
 * all post types.
 *
 * Setup steps:
 *
 * 1. Create administrator account
 * 2. Create a category
 * 3. Create member account
 * 4. Create community for posts
 * 5. Validate title length constraints
 * 6. Test special characters and HTML tag stripping
 * 7. Confirm title is required field
 */
export async function test_api_post_creation_title_validation(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: RandomGenerator.alphaNumeric(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphabets(10),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 4. Create community for posts
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_only",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Test valid title - minimum length (1 character)
  const postMinTitle =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "A",
        content_text: RandomGenerator.content(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postMinTitle);
  TestValidator.equals(
    "minimum title length is 1 character",
    postMinTitle.title,
    "A",
  );

  // 6. Test valid title - maximum length (300 characters)
  const maxLengthTitle = RandomGenerator.alphabets(300);
  const postMaxTitle =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: maxLengthTitle,
        content_text: RandomGenerator.content(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postMaxTitle);
  TestValidator.equals(
    "maximum title length is 300 characters",
    postMaxTitle.title.length,
    300,
  );

  // 7. Test title with special characters and spaces
  const specialCharsTitle = "Hello! @#$% World & Test (2024)";
  const postSpecialTitle =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: specialCharsTitle,
        content_text: RandomGenerator.content(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postSpecialTitle);
  TestValidator.equals(
    "special characters and spaces are accepted",
    postSpecialTitle.title,
    specialCharsTitle,
  );

  // 8. Test HTML tag stripping - HTML tags should be removed
  const htmlTitle = "<h1>HTML Title</h1>";
  const postHtmlTitle =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: htmlTitle,
        content_text: RandomGenerator.content(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postHtmlTitle);
  TestValidator.predicate(
    "HTML tags are stripped from title",
    !postHtmlTitle.title.includes("<") && !postHtmlTitle.title.includes(">"),
  );

  // 9. Test title exceeding maximum length (should fail)
  const overLengthTitle = RandomGenerator.alphabets(301);
  await TestValidator.error(
    "title exceeding 300 characters should be rejected",
    async () => {
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_id: community.id,
          post_type: "text",
          title: overLengthTitle,
          content_text: RandomGenerator.content(),
        } satisfies ICommunityPlatformPost.ICreate,
      });
    },
  );

  // 10. Verify title is required field (empty string should fail)
  await TestValidator.error("empty title should be rejected", async () => {
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "",
        content_text: RandomGenerator.content(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  });
}
