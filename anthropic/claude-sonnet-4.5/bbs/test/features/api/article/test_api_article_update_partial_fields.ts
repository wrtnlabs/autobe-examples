import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test partial updates where only specific fields are modified while others
 * remain unchanged.
 *
 * This test validates that the update operation supports partial updates (all
 * fields in IUpdate are optional), allowing members to change only title
 * without affecting body, or only status without affecting content. Verifies
 * that unspecified fields retain their original values, only the updated_at
 * timestamp changes, and the response contains all current article properties
 * including unchanged fields.
 *
 * Test workflow:
 *
 * 1. Create moderator and category for test setup
 * 2. Create member account and authenticate
 * 3. Create initial article with all fields populated
 * 4. Update only title - verify body/category/status unchanged
 * 5. Update only status - verify title/body/category unchanged
 * 6. Update only body - verify title/category/status unchanged and is_edited flag
 *    set
 */
export async function test_api_article_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category",
          description: "Category for partial update testing",
          sort_order: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 8 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create initial article with all fields populated and published status
  const originalTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const originalBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: originalTitle,
        body: originalBody,
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Store original values for comparison
  const originalCreatedAt = article.created_at;
  const originalPublishedAt = article.published_at;

  // Wait a moment to ensure updated_at will be different
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 5: Test Case 1 - Update only title
  const newTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const titleUpdated =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: article.id,
      body: {
        title: newTitle,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(titleUpdated);

  // Verify title changed
  TestValidator.equals("title should be updated", titleUpdated.title, newTitle);

  // Verify other fields unchanged
  TestValidator.equals(
    "body should remain unchanged",
    titleUpdated.body,
    originalBody,
  );
  TestValidator.equals(
    "category should remain unchanged",
    titleUpdated.category.id,
    category.id,
  );
  TestValidator.equals(
    "status should remain unchanged",
    titleUpdated.status,
    "published",
  );

  // Verify timestamps
  TestValidator.equals(
    "created_at should not change",
    titleUpdated.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "published_at should not change",
    titleUpdated.published_at,
    originalPublishedAt,
  );
  TestValidator.predicate(
    "updated_at should change",
    titleUpdated.updated_at !== article.updated_at,
  );
  TestValidator.equals(
    "is_edited should be true",
    titleUpdated.is_edited,
    true,
  );

  // Wait a moment for next update
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 6: Test Case 2 - Update only status (from published to archived)
  const statusUpdated =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: article.id,
      body: {
        status: "archived",
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(statusUpdated);

  // Verify status changed
  TestValidator.equals(
    "status should be updated",
    statusUpdated.status,
    "archived",
  );

  // Verify other fields unchanged (including the previously updated title)
  TestValidator.equals(
    "title should remain as updated value",
    statusUpdated.title,
    newTitle,
  );
  TestValidator.equals(
    "body should remain unchanged",
    statusUpdated.body,
    originalBody,
  );
  TestValidator.equals(
    "category should remain unchanged",
    statusUpdated.category.id,
    category.id,
  );

  // Verify timestamps
  TestValidator.equals(
    "created_at should not change",
    statusUpdated.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "published_at should not change",
    statusUpdated.published_at,
    originalPublishedAt,
  );
  TestValidator.predicate(
    "updated_at should change again",
    statusUpdated.updated_at !== titleUpdated.updated_at,
  );

  // Wait a moment for next update
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 7: Test Case 3 - Update only body
  const newBody = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 5,
    wordMax: 9,
  });
  const bodyUpdated =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: article.id,
      body: {
        body: newBody,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(bodyUpdated);

  // Verify body changed
  TestValidator.equals("body should be updated", bodyUpdated.body, newBody);

  // Verify other fields unchanged
  TestValidator.equals(
    "title should remain as updated value",
    bodyUpdated.title,
    newTitle,
  );
  TestValidator.equals(
    "status should remain as archived",
    bodyUpdated.status,
    "archived",
  );
  TestValidator.equals(
    "category should remain unchanged",
    bodyUpdated.category.id,
    category.id,
  );

  // Verify timestamps
  TestValidator.equals(
    "created_at should not change",
    bodyUpdated.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at should change again",
    bodyUpdated.updated_at !== statusUpdated.updated_at,
  );
  TestValidator.equals(
    "is_edited flag should remain true",
    bodyUpdated.is_edited,
    true,
  );

  // Final validation: Verify response contains all article properties
  TestValidator.predicate(
    "response has id",
    bodyUpdated.id !== null && bodyUpdated.id !== undefined,
  );
  TestValidator.predicate(
    "response has slug",
    bodyUpdated.slug !== null && bodyUpdated.slug !== undefined,
  );
  TestValidator.predicate(
    "response has author",
    bodyUpdated.author !== null && bodyUpdated.author !== undefined,
  );
  TestValidator.predicate(
    "response has category",
    bodyUpdated.category !== null && bodyUpdated.category !== undefined,
  );
  TestValidator.predicate(
    "response has view_count",
    typeof bodyUpdated.view_count === "number",
  );
}
