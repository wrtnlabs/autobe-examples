import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test retrieval of non-existent moderation audit log entry.
 *
 * This test validates the endpoint's behavior when attempting to retrieve a
 * moderation audit log entry using a non-existent UUID logId. The test confirms
 * that the API returns a proper 404 Not Found error response without exposing
 * sensitive information about the audit log system or other entries.
 *
 * Steps:
 *
 * 1. Create administrator account for authentication
 * 2. Attempt to retrieve audit log with non-existent UUID
 * 3. Validate that endpoint returns 404 error
 * 4. Confirm error response indicates requested log was not found
 */
export async function test_api_moderation_audit_log_detail_nonexistent_log(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2-4: Attempt to retrieve non-existent audit log and validate 404 error
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should return 404 for non-existent audit log",
    async () => {
      await api.functional.communityPlatform.administrator.moderationAuditLogs.at(
        connection,
        {
          logId: nonExistentLogId,
        },
      );
    },
  );
}
