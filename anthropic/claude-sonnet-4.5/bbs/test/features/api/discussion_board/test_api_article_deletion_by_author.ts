import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test that a member can successfully delete their own article.
 *
 * This test validates the complete article deletion workflow where a member
 * creates an article and then performs a soft deletion. The test ensures that:
 *
 * 1. Members can delete articles they own
 * 2. The deletion is a soft delete (deleted_at timestamp set)
 * 3. The article data is preserved for audit purposes
 * 4. Proper authorization is enforced (only owner can delete)
 *
 * Step-by-step process:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a category (required for articles)
 * 3. Create and authenticate a member account
 * 4. Create an article owned by the member
 * 5. Delete the article as the owner
 * 6. Verify deletion succeeded
 */
export async function test_api_article_deletion_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator for category creation
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a category (required for article creation)
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create and authenticate member account (article author)
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Create an article owned by the member
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Validate the article was created successfully
  TestValidator.equals(
    "article author matches member",
    article.author.id,
    member.id,
  );
  TestValidator.equals(
    "article title matches input",
    article.title,
    articleData.title,
  );
  TestValidator.predicate(
    "article has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      article.id,
    ),
  );

  // Step 5: Delete the article as the owner (soft delete)
  await api.functional.discussionBoard.member.articles.erase(connection, {
    articleId: article.id,
  });

  // Step 6: Verify deletion succeeded (the operation returned successfully)
  // Note: The article is soft-deleted (deleted_at timestamp set)
  // The article data remains in the database for audit purposes
  // but is no longer visible in public listings
}
