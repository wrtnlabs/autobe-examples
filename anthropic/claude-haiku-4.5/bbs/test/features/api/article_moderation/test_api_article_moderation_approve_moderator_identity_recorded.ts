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
 * Test that moderator identity is correctly recorded when approving articles.
 *
 * This test validates that when a moderator approves an article:
 *
 * 1. The moderator's identity is automatically extracted from JWT authentication
 * 2. The approvedByModerator field contains the correct moderator id and username
 * 3. Different moderators record different identities in approval records
 *
 * Test workflow:
 *
 * 1. Register and authenticate first moderator
 * 2. Attempt approval with first moderator and verify identity is recorded
 * 3. Register and authenticate second moderator
 * 4. Attempt approval with second moderator and verify identity differs
 * 5. Confirm moderator identity matches the authenticated moderator from JWT
 */
export async function test_api_article_moderation_approve_moderator_identity_recorded(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate first moderator
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1Password = "Password123!@";
  const moderator1Username = RandomGenerator.alphabets(8);

  const moderator1Auth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator1Email,
        password: moderator1Password,
        username: moderator1Username,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator1Auth);

  // Verify moderator 1 has been registered
  TestValidator.equals(
    "moderator 1 email matches registration",
    moderator1Auth.email,
    moderator1Email,
  );
  TestValidator.equals(
    "moderator 1 username matches registration",
    moderator1Auth.username,
    moderator1Username,
  );
  TestValidator.predicate(
    "moderator 1 has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderator1Auth.id,
    ),
  );

  // Step 2: Approve article with first moderator
  const articleId1 = typia.random<string & tags.Format<"uuid">>();
  const approvalNotes1 = RandomGenerator.paragraph({ sentences: 2 });

  const approvedArticle1: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: articleId1,
        body: {
          approvalNotes: approvalNotes1,
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvedArticle1);

  // Step 3: Verify moderator 1 identity is recorded in approval
  TestValidator.predicate(
    "approved article has approvedByModerator set",
    approvedArticle1.approvedByModerator !== null &&
      approvedArticle1.approvedByModerator !== undefined,
  );

  if (approvedArticle1.approvedByModerator) {
    TestValidator.equals(
      "approved article moderator id matches authenticator",
      approvedArticle1.approvedByModerator.id,
      moderator1Auth.id,
    );
    TestValidator.equals(
      "approved article moderator username matches authenticator",
      approvedArticle1.approvedByModerator.username,
      moderator1Auth.username,
    );
  }

  // Step 4: Verify article status changed to published
  TestValidator.equals(
    "approved article status is published",
    approvedArticle1.status,
    "published",
  );

  // Step 5: Verify approval notes are recorded
  TestValidator.equals(
    "approval notes are recorded",
    approvedArticle1.approval_notes,
    approvalNotes1,
  );

  // Step 6: Register and authenticate second moderator
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2Password = "Password456!@";
  const moderator2Username = RandomGenerator.alphabets(8);

  const moderator2Auth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator2Email,
        password: moderator2Password,
        username: moderator2Username,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator2Auth);

  // Step 7: Approve second article with moderator 2
  const articleId2 = typia.random<string & tags.Format<"uuid">>();
  const approvalNotes2 = RandomGenerator.paragraph({ sentences: 2 });

  const approvedArticle2: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: articleId2,
        body: {
          approvalNotes: approvalNotes2,
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvedArticle2);

  // Step 8: Verify moderator 2 identity is recorded (different from moderator 1)
  TestValidator.predicate(
    "approved article 2 has approvedByModerator set",
    approvedArticle2.approvedByModerator !== null &&
      approvedArticle2.approvedByModerator !== undefined,
  );

  if (approvedArticle2.approvedByModerator) {
    TestValidator.equals(
      "approved article 2 moderator id matches moderator 2",
      approvedArticle2.approvedByModerator.id,
      moderator2Auth.id,
    );
    TestValidator.equals(
      "approved article 2 moderator username matches moderator 2",
      approvedArticle2.approvedByModerator.username,
      moderator2Auth.username,
    );
  }

  // Step 9: Verify moderator identities are different between articles
  TestValidator.notEquals(
    "moderator identities differ between approvals",
    approvedArticle1.approvedByModerator?.id,
    approvedArticle2.approvedByModerator?.id,
  );

  // Step 10: Verify moderator 2 did not approve article 1
  TestValidator.notEquals(
    "moderator 2 does not match article 1 approval",
    approvedArticle1.approvedByModerator?.id,
    moderator2Auth.id,
  );
}
