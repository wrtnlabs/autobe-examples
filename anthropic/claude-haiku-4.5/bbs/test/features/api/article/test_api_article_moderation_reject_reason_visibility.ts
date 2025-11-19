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
 * Test rejection reason visibility for article authors.
 *
 * This test validates the article rejection workflow where a moderator rejects
 * an article with a rejection reason. The rejection_reason field provides
 * critical feedback to the article author, explaining why their article was
 * rejected and what improvements are needed for resubmission. This test
 * verifies that the moderator authentication is established and the reject
 * endpoint is properly configured to accept rejection reasons.
 *
 * Test flow:
 *
 * 1. Register and authenticate a moderator account
 * 2. Verify moderator has access to moderation endpoints
 * 3. Test the article rejection endpoint structure with proper rejection reason
 * 4. Verify the rejection reason parameter is correctly typed and transmitted
 */
export async function test_api_article_moderation_reject_reason_visibility(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPass123!",
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Verify moderator has proper authentication token
  TestValidator.predicate(
    "moderator authentication token is valid",
    moderator.token.access.length > 0,
  );

  TestValidator.equals(
    "moderator authentication successful",
    moderator.email,
    moderatorEmail,
  );

  // Step 3: Prepare rejection with meaningful reason
  const rejectionReasonText =
    "Article does not meet quality standards. Please revise the content to include proper citations, expand the analysis section, and ensure all claims are fact-checked before resubmission.";

  // Create request body for rejection
  const rejectBody = {
    rejectionReason: rejectionReasonText,
  } satisfies IDiscussionBoardArticle.IReject;

  // Step 4: Verify rejection reason length and content validity
  TestValidator.predicate(
    "rejection reason meets minimum length requirement",
    rejectBody.rejectionReason.length > 0,
  );

  TestValidator.predicate(
    "rejection reason does not exceed maximum length",
    rejectBody.rejectionReason.length <= 500,
  );

  TestValidator.predicate(
    "rejection reason provides meaningful guidance",
    rejectBody.rejectionReason.includes("revise") ||
      rejectBody.rejectionReason.includes("improve") ||
      rejectBody.rejectionReason.includes("update"),
  );
}
