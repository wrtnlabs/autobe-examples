import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModeratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratorAuditLog";

/**
 * Test basic audit log retrieval without any filtering.
 *
 * A moderator authenticates and retrieves all moderation audit log entries with
 * default pagination (page 1, limit 20). Validates that the response includes
 * complete audit trail with action types, moderator information, affected
 * contributors, timestamps, and reasons. Verifies pagination metadata (current
 * page, limit, total records, total pages) is correctly returned.
 *
 * This tests the core functionality of accessing the complete, immutable audit
 * trail for compliance review.
 */
export async function test_api_moderation_audit_log_retrieve_all_entries(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "Test@Password123";
  const moderatorUsername = RandomGenerator.alphabets(10);

  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderatorAuth);

  TestValidator.equals(
    "moderator email should match",
    moderatorAuth.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username should match",
    moderatorAuth.username,
    moderatorUsername,
  );

  // Step 2: Retrieve audit log entries with default pagination
  const auditLogResponse =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {} satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(auditLogResponse);

  // Step 3: Validate pagination metadata structure and consistency
  TestValidator.predicate(
    "pagination current page should be positive",
    auditLogResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    auditLogResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination total records should be non-negative",
    auditLogResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages should be non-negative",
    auditLogResponse.pagination.pages >= 0,
  );

  // Verify pages calculation matches records and limit
  const expectedPages = Math.ceil(
    auditLogResponse.pagination.records / auditLogResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages should match calculated value",
    auditLogResponse.pagination.pages,
    expectedPages,
  );

  // Step 4: Validate audit log entries array structure
  TestValidator.predicate(
    "audit log data should be an array",
    Array.isArray(auditLogResponse.data),
  );
  TestValidator.predicate(
    "audit log data length should not exceed limit",
    auditLogResponse.data.length <= auditLogResponse.pagination.limit,
  );

  // Step 5: Validate data consistency with pagination
  TestValidator.predicate(
    "current page should not exceed total pages",
    auditLogResponse.pagination.current <= auditLogResponse.pagination.pages,
  );

  // Step 6: If entries exist, verify they contain expected structure
  if (auditLogResponse.data.length > 0) {
    const firstEntry = auditLogResponse.data[0];

    // Verify entry has moderator who performed the action
    TestValidator.predicate(
      "audit entry should have moderator information",
      firstEntry.moderator !== null && firstEntry.moderator !== undefined,
    );

    // Verify entry has valid action type
    TestValidator.predicate(
      "audit entry should have action type",
      firstEntry.action_type !== null && firstEntry.action_type !== undefined,
    );

    // Verify entry has created timestamp
    TestValidator.predicate(
      "audit entry should have created timestamp",
      firstEntry.created_at !== null && firstEntry.created_at !== undefined,
    );
  }
}
