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
 * Test moderator authentication and article approval endpoint interaction.
 *
 * Given API limitations (no article creation or contributor endpoints
 * available), this test validates the moderator authentication flow and
 * demonstrates the approval endpoint interface. The test registers a moderator
 * and attempts to approve an article using a generated UUID. In a real
 * environment with complete API endpoints, this would be preceded by:
 *
 * - Contributor registration and authentication
 * - Article creation in pending_approval status
 * - Article retrieval by status filter
 *
 * Test workflow:
 *
 * 1. Register and authenticate moderator account
 * 2. Validate moderator credentials and account status
 * 3. Demonstrate article approval endpoint structure (with generated articleId)
 * 4. Validate approval response structure and required fields
 */
export async function test_api_article_moderation_approve_pending_article(
  connection: api.IConnection,
) {
  // 1. Register and authenticate moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Validate moderator credentials and account status
  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches input",
    moderator.username,
    moderatorUsername,
  );
  TestValidator.predicate(
    "moderator is active",
    moderator.account_status === "active",
  );
  TestValidator.predicate(
    "moderator has full moderation tier",
    moderator.moderation_tier === "full",
  );
  TestValidator.predicate(
    "moderator has valid authentication token",
    moderator.token !== undefined && moderator.token.access.length > 0,
  );

  // 3. Demonstrate article approval endpoint structure
  // In a real scenario, this would be an article created by a contributor
  // that exists in pending_approval status. Since no article creation API
  // is provided, we use a simulated articleId.
  const articleIdForApproval: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const approvalNotes = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });

  const approvalResponse: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: articleIdForApproval,
        body: {
          approvalNotes: approvalNotes,
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvalResponse);

  // 4. Validate approval response structure and required fields
  TestValidator.predicate(
    "approval response has article id",
    approvalResponse.id !== undefined && approvalResponse.id.length > 0,
  );
  TestValidator.predicate(
    "approval response has title",
    approvalResponse.title !== undefined && approvalResponse.title.length >= 5,
  );
  TestValidator.predicate(
    "approval response has content",
    approvalResponse.content !== undefined &&
      approvalResponse.content.length >= 50,
  );
  TestValidator.predicate(
    "article status is published",
    approvalResponse.status === "published",
  );
  TestValidator.predicate(
    "approvedByModerator is recorded",
    approvalResponse.approvedByModerator !== undefined &&
      approvalResponse.approvedByModerator !== null,
  );
  TestValidator.predicate(
    "published_at timestamp is set",
    approvalResponse.published_at !== undefined &&
      approvalResponse.published_at !== null,
  );
  TestValidator.equals(
    "approval notes match input",
    approvalResponse.approval_notes,
    approvalNotes,
  );
  TestValidator.predicate(
    "article has author information",
    approvalResponse.author !== undefined &&
      approvalResponse.author.id !== undefined,
  );
  TestValidator.predicate(
    "article has category information",
    approvalResponse.category !== undefined &&
      approvalResponse.category.id !== undefined,
  );
}
