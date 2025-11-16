import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test attempting to create a decision for a non-existent report ID.
 *
 * Validates that the system properly rejects requests to create moderation
 * decisions for reports that don't exist. This ensures referential integrity
 * and prevents orphaned decision records.
 *
 * Test flow:
 *
 * 1. Register a moderator account via authentication
 * 2. Attempt to create a moderation decision with a non-existent report ID
 * 3. Verify that the API returns an error (404 or validation error)
 * 4. Confirm the error indicates the report doesn't exist
 */
export async function test_api_moderation_decision_moderator_create_invalid_report_id(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Attempt to create decision with non-existent report ID
  const invalidReportId = typia.random<string & tags.Format<"uuid">>();

  const decisionData = {
    action_type: "no_action" as const,
    reason: "This report does not exist in the system.",
  } satisfies ICommunityPlatformReportDecision.ICreate;

  // Step 3: Verify error when creating decision for non-existent report
  await TestValidator.error(
    "should reject decision creation for non-existent report",
    async () => {
      await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId: invalidReportId,
          body: decisionData,
        },
      );
    },
  );
}
