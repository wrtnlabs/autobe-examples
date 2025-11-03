import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";

/**
 * Validate that unauthenticated requests to retrieve a discussion board audit
 * log are rejected by the server. This test intentionally does NOT perform any
 * authentication and attempts to read a sensitive moderator resource. Expected
 * behavior: the API should reject the request with an authorization error (401
 * or 403) and must not return the audit payload to the anonymous client.
 *
 * Steps:
 *
 * 1. Generate a realistic UUID for auditLogId to represent an existing audit
 *    record produced by environment setup.
 * 2. Call GET /discussionBoard/moderator/auditLogs/{auditLogId} without
 *    authenticating and expect an authorization HTTP error (401 or 403).
 */
export async function test_api_audit_log_retrieval_unauthenticated(
  connection: api.IConnection,
) {
  // Prepare a plausible auditLogId (simulate an existing audit record id)
  const auditLogId = typia.random<string & tags.Format<"uuid">>();

  // Attempt retrieval without authentication; expect 401 or 403
  await TestValidator.httpError(
    "unauthenticated request to retrieve audit log should be rejected with 401 or 403",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.moderator.auditLogs.at(connection, {
        auditLogId,
      });
    },
  );
}
