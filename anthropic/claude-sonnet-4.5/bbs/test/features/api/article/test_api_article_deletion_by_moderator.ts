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
 * Test complete workflow where a moderator deletes a member-authored article.
 *
 * This test validates moderator's elevated permissions to remove any article
 * regardless of authorship. The workflow creates a category (moderator),
 * creates a member account, has the member create a published article, then
 * switches to moderator context to delete the member's article. Verifies that
 * the article is soft-deleted (deleted_at timestamp set) and confirms the
 * deletion response includes the deleted article data with the deletion
 * timestamp.
 *
 * Workflow Steps:
 *
 * 1. Create and authenticate as moderator
 * 2. Create article category for classification
 * 3. Create and authenticate as member
 * 4. Member creates published article
 * 5. Switch back to moderator authentication
 * 6. Moderator deletes member's article
 * 7. Verify soft deletion and response data
 */
export async function test_api_article_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.Format<"password">>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category (requires moderator authentication)
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates published article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Verify article was created successfully
  TestValidator.equals(
    "article category matches",
    article.category.id,
    category.id,
  );
  TestValidator.equals(
    "article status is published",
    article.status,
    "published",
  );
  TestValidator.equals(
    "article author is member",
    article.author.id,
    member.id,
  );

  // Step 5: Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 6: Moderator deletes member's article
  const deletedArticle =
    await api.functional.discussionBoard.moderator.articles.erase(connection, {
      articleId: article.id,
    });
  typia.assert(deletedArticle);

  // Step 7: Verify soft deletion
  TestValidator.equals(
    "deleted article ID matches original",
    deletedArticle.id,
    article.id,
  );
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedArticle.deleted_at !== null &&
      deletedArticle.deleted_at !== undefined,
  );
  TestValidator.equals(
    "article title preserved after deletion",
    deletedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article author preserved after deletion",
    deletedArticle.author.id,
    member.id,
  );
}
