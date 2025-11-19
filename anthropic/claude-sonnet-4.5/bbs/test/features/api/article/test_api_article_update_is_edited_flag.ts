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
 * Test that the is_edited flag is correctly set when published articles are
 * modified.
 *
 * This test validates transparency about content revisions by ensuring
 * is_edited transitions from false to true when a published article is updated.
 * It also verifies that modifying draft articles does not set is_edited, and
 * that the flag persists across multiple edits.
 *
 * Test flow:
 *
 * 1. Create moderator account for category management
 * 2. Create article category for testing
 * 3. Register member account for article authoring
 * 4. Create draft article and verify is_edited=false initially
 * 5. Modify draft article and verify is_edited remains false (not yet published)
 * 6. Publish the article and verify is_edited=false for newly published content
 * 7. Modify published article and verify is_edited transitions to true
 * 8. Modify published article again and verify is_edited remains true (persists)
 */
export async function test_api_article_update_is_edited_flag(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/home",
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
          description: "Category for is_edited flag testing",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Register member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create draft article
  const draftArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Test Article for is_edited Flag",
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        discussion_board_article_category_id: category.id,
        status: "draft",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(draftArticle);

  // Verify draft article has is_edited=false initially
  TestValidator.equals(
    "draft article should have is_edited=false initially",
    draftArticle.is_edited,
    false,
  );

  // Step 5: Modify draft article
  const modifiedDraft =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: draftArticle.id,
      body: {
        title: "Modified Draft Title",
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 12,
          sentenceMax: 18,
        }),
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(modifiedDraft);

  // Verify draft article still has is_edited=false after modification
  TestValidator.equals(
    "modified draft article should keep is_edited=false",
    modifiedDraft.is_edited,
    false,
  );

  // Step 6: Publish the article
  const publishedArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: draftArticle.id,
      body: {
        status: "published",
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(publishedArticle);

  // Verify newly published article has is_edited=false
  TestValidator.equals(
    "newly published article should have is_edited=false",
    publishedArticle.is_edited,
    false,
  );
  TestValidator.equals(
    "article status should be published",
    publishedArticle.status,
    "published",
  );
  TestValidator.predicate(
    "published_at should be set",
    publishedArticle.published_at !== null &&
      publishedArticle.published_at !== undefined,
  );

  // Step 7: Modify published article (first edit)
  const editedArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: draftArticle.id,
      body: {
        title: "Edited Published Article",
        body: RandomGenerator.content({
          paragraphs: 4,
          sentenceMin: 15,
          sentenceMax: 20,
        }),
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(editedArticle);

  // Verify is_edited transitions to true after modifying published article
  TestValidator.equals(
    "published article should have is_edited=true after modification",
    editedArticle.is_edited,
    true,
  );
  TestValidator.equals(
    "article should remain published",
    editedArticle.status,
    "published",
  );

  // Step 8: Modify published article again (second edit)
  const secondEditedArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: draftArticle.id,
      body: {
        body: RandomGenerator.content({
          paragraphs: 5,
          sentenceMin: 10,
          sentenceMax: 25,
        }),
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(secondEditedArticle);

  // Verify is_edited persists as true across multiple edits
  TestValidator.equals(
    "is_edited should persist as true after multiple edits",
    secondEditedArticle.is_edited,
    true,
  );
  TestValidator.equals(
    "article should still be published",
    secondEditedArticle.status,
    "published",
  );
}
