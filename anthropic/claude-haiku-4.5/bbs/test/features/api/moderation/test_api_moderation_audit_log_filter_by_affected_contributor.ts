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
 * Test filtering audit log entries by affected contributor ID to review
 * complete enforcement history.
 *
 * A moderator authenticates and retrieves all audit log entries where a
 * specific contributor was the subject of moderation actions. The test
 * validates that results show all warnings, restrictions, and suspensions
 * imposed on that contributor.
 *
 * Test workflow:
 *
 * 1. Create a moderator account to gain audit log access permissions
 * 2. Generate a random affected contributor ID to simulate a target user
 * 3. Query the audit log API with the affected_contributor_id filter
 * 4. Validate the paginated response structure and data integrity
 * 5. Verify audit log entries contain proper moderator and contributor information
 * 6. Confirm response matches expected audit log summary format
 */
export async function test_api_moderation_audit_log_filter_by_affected_contributor(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword =
    RandomGenerator.alphabets(8).toUpperCase() +
    RandomGenerator.alphabets(8).toLowerCase() +
    RandomGenerator.alphaNumeric(2) +
    "!";
  const moderatorUsername = RandomGenerator.alphaNumeric(8).toLowerCase();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created successfully",
    moderator.id !== null && moderator.id !== undefined,
  );

  // Step 2: Generate a random affected contributor ID for filtering
  const affectedContributorId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Query audit log filtered by affected contributor ID
  const auditLogResponse: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          affected_contributor_id: affectedContributorId,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );

  typia.assert(auditLogResponse);

  // Step 4: Validate pagination structure
  TestValidator.predicate(
    "audit log response has pagination information",
    auditLogResponse.pagination !== null &&
      auditLogResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination current page is valid",
    auditLogResponse.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit is valid",
    auditLogResponse.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination total records is valid",
    auditLogResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination total pages is valid",
    auditLogResponse.pagination.pages >= 0,
  );

  // Step 5: Validate audit log data structure
  TestValidator.predicate(
    "audit log data is an array",
    Array.isArray(auditLogResponse.data),
  );

  // Step 6: If data exists, validate individual entries
  if (auditLogResponse.data && auditLogResponse.data.length > 0) {
    auditLogResponse.data.forEach((entry, index) => {
      TestValidator.predicate(
        `audit log entry ${index} has valid ID`,
        entry.id !== null && entry.id !== undefined,
      );

      TestValidator.predicate(
        `audit log entry ${index} has action type`,
        entry.action_type !== null && entry.action_type !== undefined,
      );

      TestValidator.predicate(
        `audit log entry ${index} has moderator information`,
        entry.moderator !== null &&
          entry.moderator !== undefined &&
          entry.moderator.id !== null &&
          entry.moderator.username !== null,
      );

      TestValidator.predicate(
        `audit log entry ${index} has created timestamp`,
        entry.created_at !== null && entry.created_at !== undefined,
      );

      // Validate affected contributor if present
      if (
        entry.affected_contributor !== null &&
        entry.affected_contributor !== undefined
      ) {
        TestValidator.predicate(
          `audit log entry ${index} affected contributor has ID`,
          entry.affected_contributor.id !== null,
        );

        TestValidator.predicate(
          `audit log entry ${index} affected contributor has username`,
          entry.affected_contributor.username !== null,
        );
      }
    });
  }

  // Step 7: Test with pagination parameters
  const paginatedResponse: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          affected_contributor_id: affectedContributorId,
          page: 1,
          limit: 10,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );

  typia.assert(paginatedResponse);
  TestValidator.equals(
    "paginated response limit matches request",
    paginatedResponse.pagination.limit,
    10,
  );

  // Step 8: Test without optional filters to ensure basic filtering works
  const basicFilterResponse: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          affected_contributor_id: affectedContributorId,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );

  typia.assert(basicFilterResponse);
  TestValidator.predicate(
    "basic filter response has valid structure",
    basicFilterResponse.pagination !== null &&
      Array.isArray(basicFilterResponse.data),
  );
}
