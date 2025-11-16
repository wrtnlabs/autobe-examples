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
 * Test moderation decision creation with non-existent report ID.
 *
 * Validates that the API properly rejects decision creation attempts when the
 * report does not exist. This test ensures referential integrity by verifying
 * that 404 Not Found is returned when attempting to create a decision for a
 * non-existent report ID.
 *
 * Test flow:
 *
 * 1. Register/authenticate a moderator account to gain necessary permissions
 * 2. Generate a random UUID that does not correspond to any actual report
 * 3. Attempt to create a moderation decision for the non-existent report
 * 4. Verify the API returns a 404 Not Found error
 * 5. Confirm the error response validates referential integrity
 */
export async function test_api_moderation_decision_creation_nonexistent_report(
  connection: api.IConnection,
) {
  // Step 1: Register/authenticate as a moderator
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate a non-existent report ID (random UUID)
  const nonExistentReportId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to create a decision for the non-existent report
  // Step 4 & 5: Verify 404 error is returned
  await TestValidator.httpError(
    "should return 404 when creating decision for non-existent report",
    404,
    async () => {
      return await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId: nonExistentReportId,
          body: {
            action_type: "no_action",
            reason:
              "Testing invalid report reference with proper decision reasoning",
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    },
  );
}
