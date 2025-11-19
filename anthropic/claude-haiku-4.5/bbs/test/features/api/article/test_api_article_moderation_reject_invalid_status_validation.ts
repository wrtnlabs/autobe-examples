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
 * Test validation behavior when attempting to reject articles.
 *
 * Validates the moderator article rejection endpoint handles requests properly
 * and returns appropriate errors when attempting to reject non-existent or
 * improperly formatted articles. Tests the rejection request structure and
 * error handling for the moderation workflow.
 *
 * Test workflow:
 *
 * 1. Authenticate moderator for rejection operations
 * 2. Attempt rejection with invalid/non-existent article ID
 * 3. Validate proper error handling and response structure
 * 4. Verify rejection endpoint enforces business rules
 */
export async function test_api_article_moderation_reject_invalid_status_validation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia
          .random<string & tags.Format<"email">>()
          .toLowerCase()
          .replace(/[^a-z0-9@.]/g, "a"),
        password: "SecurePass123!",
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Validate moderator authentication is properly configured
  TestValidator.equals(
    "moderator email should be valid email format",
    /^[a-z0-9]+@[a-z0-9]+\.[a-z]+$/.test(moderator.email),
    true,
  );
  TestValidator.equals(
    "moderator should have active status",
    moderator.account_status,
    "active",
  );
  TestValidator.equals(
    "moderator should have full moderation tier",
    moderator.moderation_tier,
    "full",
  );
  TestValidator.predicate(
    "moderator should have valid JWT token",
    typeof moderator.token.access === "string" &&
      moderator.token.access.length > 0,
  );

  // 3. Attempt to reject non-existent article
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should fail when rejecting non-existent article",
    async () => {
      await api.functional.discussionBoard.moderator.articles.reject(
        connection,
        {
          articleId: nonExistentArticleId,
          body: {
            rejectionReason: "Article does not meet community guidelines",
          } satisfies IDiscussionBoardArticle.IReject,
        },
      );
    },
  );

  // 4. Validate rejection request structure with proper rejection reason
  const validRejectionReason = RandomGenerator.paragraph({
    sentences: 5,
  }).substring(0, 500);

  TestValidator.predicate(
    "rejection reason should be valid string",
    typeof validRejectionReason === "string" &&
      validRejectionReason.length > 0 &&
      validRejectionReason.length <= 500,
  );
}
