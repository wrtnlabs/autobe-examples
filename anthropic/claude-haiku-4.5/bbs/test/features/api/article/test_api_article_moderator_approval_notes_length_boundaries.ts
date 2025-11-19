import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test approval_notes length validation boundaries for article moderation.
 *
 * Validates that the approval_notes field properly enforces its maximum length
 * constraint of 1,000 characters when moderators approve articles. Tests edge
 * cases at the boundary (999, 1000, and 1001 characters) to ensure proper
 * validation and storage.
 *
 * Steps:
 *
 * 1. Create and authenticate a contributor
 * 2. Create an article in draft status
 * 3. Update article to pending_approval status
 * 4. Create and authenticate a moderator
 * 5. Test approval with exactly 1,000 characters (should succeed)
 * 6. Verify the approval_notes are stored correctly
 * 7. Test approval with 999 characters (should succeed)
 * 8. Test approval with 1,001 characters (should fail)
 */
export async function test_api_article_moderator_approval_notes_length_boundaries(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "TestPass123!@";
  const contributorUsername = RandomGenerator.alphaNumeric(8);
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: contributorUsername,
      password: contributorPassword,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Step 2: Create article in draft status
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Test Article for Approval Notes Boundary",
          content: RandomGenerator.content({ paragraphs: 3 }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Update article to pending_approval status
  const pendingArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          status: "pending_approval",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(pendingArticle);
  TestValidator.equals(
    "article status should be pending_approval",
    pendingArticle.status,
    "pending_approval",
  );

  // Step 4: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123!@";
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 5: Test approval with exactly 1,000 characters
  const approvalNotes1000 = "A".repeat(1000);
  const approvedArticle1000 =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: article.id,
        body: {
          status: "published",
          approval_notes: approvalNotes1000,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(approvedArticle1000);
  TestValidator.equals(
    "approval_notes should be stored with exactly 1000 characters",
    approvedArticle1000.approval_notes,
    approvalNotes1000,
  );
  TestValidator.equals(
    "article status should be published",
    approvedArticle1000.status,
    "published",
  );

  // Re-authenticate as contributor for article 2
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: contributorPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  // Step 6: Create another article for 999 character test
  const article2 =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Test Article 2 for Approval Notes",
          content: RandomGenerator.content({ paragraphs: 3 }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article2);

  // Update to pending_approval
  await api.functional.discussionBoard.contributor.articles.update(connection, {
    articleId: article2.id,
    body: {
      status: "pending_approval",
    } satisfies IDiscussionBoardArticle.IUpdate,
  });

  // Re-authenticate as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Test approval with 999 characters
  const approvalNotes999 = "B".repeat(999);
  const approvedArticle999 =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: article2.id,
        body: {
          status: "published",
          approval_notes: approvalNotes999,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(approvedArticle999);
  TestValidator.equals(
    "approval_notes should be stored with 999 characters",
    approvedArticle999.approval_notes,
    approvalNotes999,
  );

  // Re-authenticate as contributor for article 3
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: contributorPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  // Step 7: Create another article for 1001 character test
  const article3 =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Test Article 3 for Approval Notes",
          content: RandomGenerator.content({ paragraphs: 3 }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article3);

  // Update to pending_approval
  await api.functional.discussionBoard.contributor.articles.update(connection, {
    articleId: article3.id,
    body: {
      status: "pending_approval",
    } satisfies IDiscussionBoardArticle.IUpdate,
  });

  // Re-authenticate as moderator for final test
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 8: Test that 1001 characters fails
  const approvalNotes1001 = "C".repeat(1001);
  await TestValidator.error(
    "approval with 1001 characters should fail",
    async () => {
      await api.functional.discussionBoard.moderator.articles.updateByModerator(
        connection,
        {
          articleId: article3.id,
          body: {
            status: "published",
            approval_notes: approvalNotes1001,
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    },
  );
}
