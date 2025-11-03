import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

export async function test_api_moderation_action_creation_with_related_report(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account with complete registration information
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const moderatorPassword = "SecurePass123!@#";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        href: "https://example.com/moderator/register",
        referrer: "https://example.com/moderator/landing",
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(moderator);

  // Step 2: Create a moderation action with link to a triggering report
  // Generate realistic UUIDs for the related report and target content
  const relatedReportId = typia.random<string & tags.Format<"uuid">>();
  const targetArticleId = typia.random<string & tags.Format<"uuid">>();

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: {
          related_report_id: relatedReportId,
          action_type: "delete_content",
          target_type: "article",
          target_id: targetArticleId,
          reason:
            "Content violates community guidelines regarding spam and promotional material",
          details:
            "Article contains multiple links to commercial services without disclosure. User has been previously warned about similar violations. Community report cited specific guideline violations that were verified during moderator review.",
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );

  typia.assert(moderationAction);

  // Step 3: Validate key business logic fields
  TestValidator.equals(
    "moderation action type should match request",
    moderationAction.action_type,
    "delete_content",
  );

  TestValidator.equals(
    "target type should match request",
    moderationAction.target_type,
    "article",
  );

  TestValidator.equals(
    "target ID should match request",
    moderationAction.target_id,
    targetArticleId,
  );

  TestValidator.equals(
    "reason should match request",
    moderationAction.reason,
    "Content violates community guidelines regarding spam and promotional material",
  );

  // Step 4: Verify the critical related_report_id linkage for traceability
  if (
    moderationAction.related_report_id !== null &&
    moderationAction.related_report_id !== undefined
  ) {
    TestValidator.equals(
      "related report ID should establish traceability to triggering report",
      moderationAction.related_report_id,
      relatedReportId,
    );
  }

  // Step 5: Validate moderator attribution for accountability
  TestValidator.equals(
    "moderator ID should match authenticated moderator",
    moderationAction.discussion_board_moderator_id,
    moderator.id,
  );

  TestValidator.equals(
    "embedded moderator summary username should match",
    moderationAction.moderator.username,
    moderatorUsername,
  );
}
