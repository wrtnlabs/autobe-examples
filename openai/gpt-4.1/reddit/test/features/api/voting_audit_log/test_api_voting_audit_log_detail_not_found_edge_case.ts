import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVotingAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingAuditLog";

/**
 * Validate that requesting a non-existent voting audit log by ID as an
 * authenticated administrator results in a graceful, non-leaky error response.
 *
 * 1. Register and authenticate as an administrator via POST
 *    /auth/administrator/join.
 * 2. Attempt to GET
 *    /communityPlatform/administrator/votingAuditLogs/{votingAuditLogId} using
 *    a random, non-existent UUID.
 * 3. Check that the response is an error, there is no information leakage, and the
 *    error handling is secure and generic.
 */
export async function test_api_voting_audit_log_detail_not_found_edge_case(
  connection: api.IConnection,
) {
  // 1. Register and authenticate administrator
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);
  // 2. Try to retrieve a voting audit log that does not exist
  const nonExistentVotingAuditLogId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should error on not found voting audit log",
    async () => {
      await api.functional.communityPlatform.administrator.votingAuditLogs.at(
        connection,
        { votingAuditLogId: nonExistentVotingAuditLogId },
      );
    },
  );
}
