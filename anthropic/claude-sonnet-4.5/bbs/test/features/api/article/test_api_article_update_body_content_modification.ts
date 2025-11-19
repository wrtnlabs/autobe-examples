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
 * Test updating article body content to validate content revision workflows.
 *
 * This test validates that members can modify article body text while enforcing
 * the 50-50000 character constraints. It tests partial content updates,
 * complete content replacement, and boundary cases for body length. The test
 * verifies that body updates trigger automatic excerpt regeneration from the
 * new content, updated_at timestamp is refreshed, and is_edited flag is set for
 * published articles. This validates the core content editing functionality.
 *
 * Test Flow:
 *
 * 1. Create moderator account for category setup
 * 2. Create article category
 * 3. Create member account for article operations
 * 4. Create initial published article with known body content
 * 5. Update article body with new content (partial update)
 * 6. Verify body content is updated correctly
 * 7. Verify excerpt is regenerated from new body (first 200 chars)
 * 8. Verify is_edited flag is set to true
 * 9. Verify updated_at timestamp is refreshed
 * 10. Verify other fields remain unchanged (title, slug, category)
 * 11. Test boundary case: minimum body length (50 characters)
 * 12. Test boundary case: maximum body length (50000 characters)
 */
export async function test_api_article_update_body_content_modification(
  connection: api.IConnection,
) {
  // 1. Create moderator account for category setup
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create article category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Discussion about economic topics and policies",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account for article operations
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 4. Create initial published article with known body content
  const initialBodyContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 5,
    wordMax: 8,
  });

  const initialArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        body: initialBodyContent,
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(initialArticle);

  // Verify initial state
  TestValidator.equals(
    "initial body content",
    initialArticle.body,
    initialBodyContent,
  );
  TestValidator.equals(
    "initial is_edited flag",
    initialArticle.is_edited,
    false,
  );

  // 5. Update article body with new content (partial update)
  const updatedBodyContent = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 12,
    sentenceMax: 20,
    wordMin: 6,
    wordMax: 10,
  });

  const updatedArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: initialArticle.id,
      body: {
        body: updatedBodyContent,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // 6. Verify body content is updated correctly
  TestValidator.equals(
    "body content updated",
    updatedArticle.body,
    updatedBodyContent,
  );
  TestValidator.notEquals(
    "body content changed from initial",
    updatedArticle.body,
    initialBodyContent,
  );

  // 7. Verify excerpt is regenerated from new body (first 200 chars)
  const expectedExcerpt = updatedBodyContent.substring(0, 200);
  TestValidator.equals(
    "excerpt regenerated from new body",
    updatedArticle.excerpt,
    expectedExcerpt,
  );

  // 8. Verify is_edited flag is set to true
  TestValidator.equals(
    "is_edited flag set to true",
    updatedArticle.is_edited,
    true,
  );

  // 9. Verify updated_at timestamp is refreshed
  const createdAtTime = new Date(updatedArticle.created_at).getTime();
  const updatedAtTime = new Date(updatedArticle.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is after created_at",
    updatedAtTime > createdAtTime,
  );

  // 10. Verify other fields remain unchanged
  TestValidator.equals(
    "title unchanged",
    updatedArticle.title,
    initialArticle.title,
  );
  TestValidator.equals(
    "slug unchanged",
    updatedArticle.slug,
    initialArticle.slug,
  );
  TestValidator.equals(
    "category unchanged",
    updatedArticle.category.id,
    initialArticle.category.id,
  );
  TestValidator.equals(
    "status unchanged",
    updatedArticle.status,
    initialArticle.status,
  );
  TestValidator.equals(
    "view_count unchanged",
    updatedArticle.view_count,
    initialArticle.view_count,
  );

  // 11. Test boundary case: minimum body length (50 characters)
  const minBodyContent = RandomGenerator.alphabets(50);

  const minBodyArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: initialArticle.id,
      body: {
        body: minBodyContent,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(minBodyArticle);
  TestValidator.equals(
    "minimum body length accepted",
    minBodyArticle.body,
    minBodyContent,
  );
  TestValidator.equals(
    "minimum body length is 50 chars",
    minBodyArticle.body.length,
    50,
  );

  // 12. Test boundary case: maximum body length (50000 characters)
  const maxBodyContent = RandomGenerator.alphabets(50000);

  const maxBodyArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: initialArticle.id,
      body: {
        body: maxBodyContent,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(maxBodyArticle);
  TestValidator.equals(
    "maximum body length accepted",
    maxBodyArticle.body,
    maxBodyContent,
  );
  TestValidator.equals(
    "maximum body length is 50000 chars",
    maxBodyArticle.body.length,
    50000,
  );
}
