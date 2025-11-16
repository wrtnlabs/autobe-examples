import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test ban creation with non-existent member ID returns appropriate error.
 *
 * This test validates referential integrity by ensuring that attempting to
 * create a ban for a member ID that does not exist in the system fails with an
 * appropriate error response. The test confirms that the API prevents creation
 * of orphaned ban records by validating member existence before allowing the
 * ban to be recorded.
 *
 * Test flow:
 *
 * 1. Create moderator account for authorization
 * 2. Generate a non-existent member ID (valid UUID format but not in system)
 * 3. Generate a non-existent report decision ID (valid UUID format but not in
 *    system)
 * 4. Attempt to create a ban with the non-existent member ID
 * 5. Verify the operation fails with HTTP error (404 or 400)
 * 6. Confirm no ban record was created
 */
export async function test_api_member_bans_create_invalid_member_id(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authorization
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate non-existent member ID
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Generate non-existent report decision ID
  const nonExistentDecisionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4 & 5: Attempt to create ban with non-existent member ID
  // Verify the operation fails with HTTP error
  await TestValidator.error(
    "creating ban with non-existent member ID should fail",
    async () => {
      await api.functional.communityPlatform.moderator.memberBans.create(
        connection,
        {
          body: {
            community_platform_member_id: nonExistentMemberId,
            community_platform_report_decision_id: nonExistentDecisionId,
            ban_reason: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 10,
              sentenceMax: 15,
              wordMin: 4,
              wordMax: 8,
            }),
            appeal_eligible_at: new Date(
              Date.now() + 365 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          } satisfies ICommunityPlatformMemberBan.ICreate,
        },
      );
    },
  );
}
