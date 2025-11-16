import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate behavior when requesting a moderation audit log with a non-existent
 * ID.
 *
 * Business goal: Ensure that a properly authenticated platform administrator
 * cannot accidentally retrieve any moderation audit log details when the
 * requested identifier does not correspond to an existing record. Instead of
 * returning a valid ICommunityPlatformModerationAuditLog, the backend must
 * signal an error condition (typically a not-found) without leaking any audit
 * data.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate a platform admin using the join endpoint.
 *
 *    - Call api.functional.auth.platformAdmin.join with a randomly generated
 *         ICommunityPlatformPlatformadmin.IJoin payload.
 *    - Rely on the SDK to inject the access token into the connection automatically.
 * 2. Generate a random UUID string to act as a clearly non-existent
 *    moderationAuditLogId using typia.random<string & tags.Format<"uuid">>().
 * 3. Attempt to fetch the moderation audit log details via
 *    api.functional.communityPlatform.platformAdmin.moderationAuditLogs.at
 *    using the random UUID as the moderationAuditLogId path parameter.
 * 4. Use TestValidator.error with an async callback to assert that the call
 *    results in an error (e.g., a not-found style error). Do NOT assert the
 *    concrete HTTP status code or inspect error payload contents; simply
 *    validate that an error is thrown.
 * 5. Confirm via control flow that no ICommunityPlatformModerationAuditLog
 *    instance is obtained from this failing call (i.e., any code after the
 *    awaited API call in the error-expected closure should be unreachable).
 */
export async function test_api_moderation_audit_log_detail_nonexistent_id_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const platformAdmin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: typia.random<ICommunityPlatformPlatformadmin.IJoin>(),
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  // 2. Generate a random UUID string that should not match any existing audit log
  const nonexistentAuditLogId = typia.random<string & tags.Format<"uuid">>();

  // 3-4. Attempt to fetch details and assert that an error occurs
  await TestValidator.error(
    "requesting moderation audit log with non-existent id should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.moderationAuditLogs.at(
        connection,
        {
          moderationAuditLogId: nonexistentAuditLogId,
        },
      );
    },
  );
}
