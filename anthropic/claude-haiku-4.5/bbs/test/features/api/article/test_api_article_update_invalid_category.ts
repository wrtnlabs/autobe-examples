import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test article update with invalid or non-existent category ID.
 *
 * This test validates that the article update API properly rejects attempts to
 * assign an article to a non-existent category. The test creates a moderator
 * and member account, creates an article with a valid category, then attempts
 * to update it with an invalid category ID. The API should return a validation
 * error confirming category validation rules are enforced during updates.
 *
 * Process:
 *
 * 1. Create moderator account for authentication
 * 2. Create member account and article with valid category
 * 3. Attempt to update article with invalid/non-existent category ID
 * 4. Verify API returns validation error for invalid category
 * 5. Confirm article category remains unchanged after failed update
 */
export async function test_api_article_update_invalid_category(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorData = {
    email: RandomGenerator.alphaNumeric(8) + "@moderator.test",
    username: "mod_" + RandomGenerator.alphaNumeric(6),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // 2. Create member account
  const memberData = {
    email: RandomGenerator.alphaNumeric(8) + "@member.test",
    username: "mem_" + RandomGenerator.alphaNumeric(6),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // 3. Create article with valid category
  const validCategoryId = typia.random<string & tags.Format<"uuid">>();
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_id: validCategoryId,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);
  TestValidator.equals(
    "article created with valid category",
    article.category.id,
    validCategoryId,
  );

  // 4. Switch to moderator context for update
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 5. Generate invalid category ID (non-existent UUID)
  const invalidCategoryId = typia.random<string & tags.Format<"uuid">>();

  // 6. Attempt to update article with invalid category - should fail
  await TestValidator.error(
    "should reject update with non-existent category",
    async () => {
      await api.functional.discussionBoard.moderator.articles.update(
        connection,
        {
          articleId: article.id,
          body: {
            category_id: invalidCategoryId,
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    },
  );

  // 7. Verify article category remains unchanged after failed update attempt
  TestValidator.equals(
    "article category remains unchanged after invalid update attempt",
    article.category.id,
    validCategoryId,
  );
}
