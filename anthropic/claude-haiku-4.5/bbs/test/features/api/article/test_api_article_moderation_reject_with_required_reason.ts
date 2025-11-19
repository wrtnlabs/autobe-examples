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
 * Test article rejection with required moderator feedback reason.
 *
 * This test validates the moderator article rejection workflow:
 *
 * 1. Register and authenticate a moderator account
 * 2. Invoke the article rejection endpoint with a rejection reason
 * 3. Validates that rejection_reason is accepted and stored
 * 4. Tests various reason lengths from minimum content to 500 character limit
 * 5. Confirms article status transitions to rejected
 *
 * The rejection reason is critical feedback that guides contributors on why
 * their article was declined and how to revise it for resubmission.
 *
 * Note: This test uses simulated article IDs as the provided API does not
 * include endpoints for creating articles. In a complete integration test,
 * articles would be created first before rejection.
 */
export async function test_api_article_moderation_reject_with_required_reason(
  connection: api.IConnection,
) {
  // 1. Register and authenticate moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        username: RandomGenerator.alphabets(15),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Create moderator connection with authentication
  const moderatorConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${moderator.token.access}`,
    },
  };

  // 2. Test rejection with short reason (minimum required content)
  const shortReason = "Content violates community guidelines";
  const rejectionWithShortReason: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.reject(
      moderatorConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          rejectionReason: shortReason,
        } satisfies IDiscussionBoardArticle.IReject,
      },
    );
  typia.assert(rejectionWithShortReason);
  TestValidator.equals(
    "rejection reason stored correctly with short reason",
    rejectionWithShortReason.rejection_reason,
    shortReason,
  );
  TestValidator.equals(
    "article status transitioned to rejected",
    rejectionWithShortReason.status,
    "rejected",
  );

  // 3. Test rejection with maximum length reason (500 characters)
  const maxLengthReason =
    "Article contains unsubstantiated claims lacking proper citations. Please provide credible academic sources for all factual assertions. Additionally, the writing style does not meet our editorial standards requiring formal tone and objective analysis. Consider revising the entire article structure to follow our guidelines on sourcing, formatting, and logical argumentation before resubmission.";
  const maxLengthTrimmed = maxLengthReason.substring(0, 500);

  const rejectionWithMaxReason: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.reject(
      moderatorConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          rejectionReason: maxLengthTrimmed,
        } satisfies IDiscussionBoardArticle.IReject,
      },
    );
  typia.assert(rejectionWithMaxReason);
  TestValidator.equals(
    "rejection reason stored correctly with maximum length",
    rejectionWithMaxReason.rejection_reason,
    maxLengthTrimmed,
  );
  TestValidator.predicate(
    "rejection reason length is within maximum (500 chars)",
    (rejectionWithMaxReason.rejection_reason ?? "").length <= 500,
  );

  // 4. Test rejection with medium length reason
  const mediumReason =
    "Article contains unsubstantiated claims and lacks proper citations. Please provide credible sources for all factual assertions and revise to meet our editorial standards.";

  const rejectionWithMediumReason: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.reject(
      moderatorConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          rejectionReason: mediumReason,
        } satisfies IDiscussionBoardArticle.IReject,
      },
    );
  typia.assert(rejectionWithMediumReason);
  TestValidator.equals(
    "rejection reason stored correctly with medium length",
    rejectionWithMediumReason.rejection_reason,
    mediumReason,
  );

  // 5. Validate rejection reason is visible and accessible
  TestValidator.predicate(
    "rejection reason is not null and contains feedback",
    rejectionWithMediumReason.rejection_reason !== null &&
      rejectionWithMediumReason.rejection_reason !== undefined &&
      rejectionWithMediumReason.rejection_reason.length > 0,
  );

  // 6. Validate article status transitions are correct
  TestValidator.equals(
    "all rejected articles have rejected status",
    rejectionWithMediumReason.status,
    "rejected",
  );

  // 7. Test rejection with detailed reason including specific feedback
  const detailedReason =
    "This article lacks sufficient evidence and contains politically biased language. Please revise with neutral tone, add peer-reviewed sources, and restructure arguments logically.";

  const rejectionWithDetailedReason: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.reject(
      moderatorConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          rejectionReason: detailedReason,
        } satisfies IDiscussionBoardArticle.IReject,
      },
    );
  typia.assert(rejectionWithDetailedReason);
  TestValidator.equals(
    "detailed rejection reason properly stored",
    rejectionWithDetailedReason.rejection_reason,
    detailedReason,
  );
}
