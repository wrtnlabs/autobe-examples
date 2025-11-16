import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVotingAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingAuditLog";

/**
 * Validate that administrator can view details of a voting audit log entry by
 * ID.
 *
 * 1. Register as administrator via /auth/administrator/join with random
 *    credentials
 * 2. Prepare or simulate a votingAuditLogId (random UUID)
 * 3. Retrieve voting audit log by ID and verify all fields are as expected and
 *    immutable
 * 4. Verify access is refused for unauthenticated connections
 */
export async function test_api_voting_audit_log_detail_view_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Register as administrator
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // Step 2: Prepare a voting audit log id
  // Simulate a votingAuditLogId as random UUID (read-only audit log entries are expected to exist in compliance environments).
  const votingAuditLogId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve the voting audit log entry by id using admin privileges
  const auditLog: ICommunityPlatformVotingAuditLog =
    await api.functional.communityPlatform.administrator.votingAuditLogs.at(
      connection,
      { votingAuditLogId },
    );
  typia.assert(auditLog);
  TestValidator.equals(
    "voting audit log id matches",
    auditLog.id,
    votingAuditLogId,
  );

  // Step 4: Verify access is refused for unauthenticated requests
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot retrieve voting audit log detail",
    async () => {
      await api.functional.communityPlatform.administrator.votingAuditLogs.at(
        unauthConn,
        { votingAuditLogId },
      );
    },
  );
}
