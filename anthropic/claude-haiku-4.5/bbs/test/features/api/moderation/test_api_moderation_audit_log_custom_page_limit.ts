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
 * Test custom page limit setting for moderation audit log.
 *
 * A moderator authenticates and retrieves the audit log with a custom limit
 * parameter (limit=50) to request 50 entries per page instead of the default
 * 20. The test validates:
 *
 * 1. Moderator authentication and authorization token acquisition
 * 2. Audit log endpoint accepts custom limit parameter values
 * 3. Response contains up to 50 audit log entries (or fewer if fewer exist)
 * 4. Pagination metadata correctly reflects limit=50
 * 5. API respects custom limit constraint (maximum 100 entries per page)
 * 6. System properly handles pagination with custom page sizes for different
 *    moderation analysis workflows
 */
export async function test_api_moderation_audit_log_custom_page_limit(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        username: `moderator_${RandomGenerator.alphaNumeric(6)}`,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve audit log with custom page limit (50 entries per page)
  const customLimit = 50;
  const auditLogResponse: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: customLimit,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(auditLogResponse);

  // Step 3: Validate pagination metadata
  TestValidator.equals(
    "pagination limit should match requested custom limit",
    auditLogResponse.pagination.limit,
    customLimit,
  );

  // Step 4: Validate response contains audit log entries
  TestValidator.predicate(
    "audit log data array should exist",
    Array.isArray(auditLogResponse.data),
  );

  // Step 5: Validate number of entries doesn't exceed the custom limit
  TestValidator.predicate(
    "number of returned entries should not exceed custom limit",
    auditLogResponse.data.length <= customLimit,
  );

  // Step 6: Validate pagination current page
  TestValidator.equals(
    "pagination current page should be 1",
    auditLogResponse.pagination.current,
    1,
  );

  // Step 7: Validate each audit log entry has required fields
  if (auditLogResponse.data.length > 0) {
    const firstEntry: IDiscussionBoardModeratorAuditLog.ISummary =
      auditLogResponse.data[0];
    typia.assert(firstEntry);

    TestValidator.predicate(
      "audit log entry should have id",
      firstEntry.id !== undefined && firstEntry.id !== null,
    );

    TestValidator.predicate(
      "audit log entry should have action_type",
      firstEntry.action_type !== undefined && firstEntry.action_type !== null,
    );

    TestValidator.predicate(
      "audit log entry should have moderator information",
      firstEntry.moderator !== undefined && firstEntry.moderator !== null,
    );

    TestValidator.predicate(
      "audit log entry should have created_at timestamp",
      firstEntry.created_at !== undefined && firstEntry.created_at !== null,
    );
  }

  // Step 8: Test with different custom limit values to verify flexibility
  const alternateLimit = 25;
  const alternateResponse: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: alternateLimit,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(alternateResponse);

  TestValidator.equals(
    "alternate limit should be reflected in pagination",
    alternateResponse.pagination.limit,
    alternateLimit,
  );

  // Step 9: Verify pagination records count is accurate
  TestValidator.predicate(
    "pagination records count should be non-negative",
    auditLogResponse.pagination.records >= 0,
  );

  // Step 10: Verify pagination pages calculation
  TestValidator.predicate(
    "pagination pages count should be non-negative",
    auditLogResponse.pagination.pages >= 0,
  );
}
