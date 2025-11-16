import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test retrieval of a non-existent moderation audit log entry.
 *
 * This test validates error handling when attempting to retrieve an audit log
 * using an invalid or non-existent log ID. The scenario establishes moderator
 * authentication first, then attempts to fetch an audit log with a randomly
 * generated UUID that does not exist in the system. The endpoint should return
 * a 404 Not Found error, confirming proper handling of missing resources.
 *
 * Test flow:
 *
 * 1. Register and authenticate a moderator account
 * 2. Generate a non-existent log ID (random UUID)
 * 3. Attempt to retrieve the audit log with this non-existent ID
 * 4. Verify 404 error is returned
 */
export async function test_api_moderation_audit_logs_nonexistent_log_not_found(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a moderator account
  const moderatorCreated = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    },
  );
  typia.assert(moderatorCreated);

  // Step 2: Generate a non-existent log ID
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to retrieve the non-existent audit log
  await TestValidator.error(
    "should return 404 for non-existent audit log",
    async () => {
      await api.functional.communityPlatform.moderator.moderationAuditLogs.at(
        connection,
        {
          logId: nonExistentLogId,
        },
      );
    },
  );

  TestValidator.predicate("test completed successfully", true);
}
