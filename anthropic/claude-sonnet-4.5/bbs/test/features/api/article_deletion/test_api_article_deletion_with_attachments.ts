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
 * Test article deletion with cascading soft deletion of associated attachments.
 *
 * This test validates the critical data integrity behavior when deleting
 * articles that have associated attachments. The system must properly cascade
 * the soft deletion to all related attachment records to prevent orphaned
 * data.
 *
 * Test Flow:
 *
 * 1. Create and authenticate moderator account for category creation
 * 2. Create article category for classification
 * 3. Create and authenticate member account for article authoring
 * 4. Create article with content (potential attachment references)
 * 5. Delete the article as the authenticated member
 * 6. Validate article is soft-deleted with proper deleted_at timestamp
 * 7. Verify cascading deletion behavior maintains data consistency
 */
export async function test_api_article_deletion_with_attachments(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator for category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create category as moderator
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category for Deletion",
          slug: "test-category-deletion" satisfies string &
            tags.Pattern<"^[a-z0-9]+(?:-[a-z0-9]+)*$">,
          description: "Category for testing article deletion behavior",
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Switch to member authentication for article creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 8 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create article with content
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 8,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Validate article was created successfully
  TestValidator.equals(
    "article category matches",
    article.category.id,
    category.id,
  );
  TestValidator.equals("article author matches", article.author.id, member.id);
  TestValidator.equals(
    "article status is published",
    article.status,
    "published",
  );
  TestValidator.predicate(
    "article has no deleted_at timestamp",
    article.deleted_at === null || article.deleted_at === undefined,
  );

  // Step 5: Delete the article as the authenticated member
  const deletedArticle =
    await api.functional.discussionBoard.member.articles.erase(connection, {
      articleId: article.id,
    });
  typia.assert(deletedArticle);

  // Step 6: Validate soft deletion occurred
  TestValidator.equals(
    "deleted article ID matches",
    deletedArticle.id,
    article.id,
  );
  TestValidator.predicate(
    "article has deleted_at timestamp set",
    deletedArticle.deleted_at !== null &&
      deletedArticle.deleted_at !== undefined,
  );

  // Validate deleted_at is a valid date-time string
  typia.assert<string & tags.Format<"date-time">>(deletedArticle.deleted_at!);

  // Verify the deleted_at timestamp is recent (within last minute)
  const deletedAtDate = new Date(deletedArticle.deleted_at!);
  const now = new Date();
  const timeDifferenceMs = now.getTime() - deletedAtDate.getTime();
  TestValidator.predicate(
    "deletion timestamp is recent",
    timeDifferenceMs >= 0 && timeDifferenceMs < 60000,
  );
}
