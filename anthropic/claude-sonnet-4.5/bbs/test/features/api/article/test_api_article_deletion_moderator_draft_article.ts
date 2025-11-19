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
 * Test moderator deletion of draft articles.
 *
 * This test validates that moderators can delete draft articles (status:
 * 'draft') with the same permissions as published articles, confirming that
 * article status does not affect moderator deletion authority. The test
 * verifies the soft deletion mechanism sets the deleted_at timestamp
 * correctly.
 *
 * Test Flow:
 *
 * 1. Create moderator account for category creation and deletion operations
 * 2. Authenticate as moderator and create article category
 * 3. Create member account for article authoring
 * 4. Authenticate as member and create draft article
 * 5. Switch back to moderator authentication
 * 6. Delete the draft article as moderator
 * 7. Validate soft deletion with deleted_at timestamp
 */
export async function test_api_article_deletion_moderator_draft_article(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(10),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category as moderator
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8),
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
  const memberPassword = "member123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(10),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create draft article as member
  const draftArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_article_category_id: category.id,
        status: "draft",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(draftArticle);

  // Validate article is in draft status
  TestValidator.equals("article status is draft", draftArticle.status, "draft");

  // Step 5: Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 6: Delete the draft article as moderator
  const deletedArticle =
    await api.functional.discussionBoard.moderator.articles.erase(connection, {
      articleId: draftArticle.id,
    });
  typia.assert(deletedArticle);

  // Step 7: Validate soft deletion
  TestValidator.equals(
    "deleted article ID matches",
    deletedArticle.id,
    draftArticle.id,
  );
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedArticle.deleted_at !== null &&
      deletedArticle.deleted_at !== undefined,
  );
}
