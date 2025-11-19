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
 * Test sorting audit log by moderator ID for performance analysis.
 *
 * Validates that the audit log API correctly sorts moderation audit entries by
 * moderator ID when requested. This test ensures that moderators can analyze
 * performance metrics grouped by individual moderator, enabling comparison of
 * decision patterns, consistency, and quality across the moderation team.
 *
 * The test flow:
 *
 * 1. Create first moderator account
 * 2. Create second moderator account
 * 3. Authenticate as the first moderator
 * 4. Retrieve audit log entries sorted by moderator_id in ascending order
 * 5. Verify entries are correctly sorted by moderator ID
 * 6. Retrieve audit log entries sorted by moderator_id in descending order
 * 7. Verify entries are correctly sorted in reverse order by moderator ID
 * 8. Validate pagination and data structure
 */
export async function test_api_moderation_audit_log_sort_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create first moderator account
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      password: "SecurePass123!",
      username: RandomGenerator.alphabets(10),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator1);

  // 2. Create second moderator account
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      password: "SecurePass123!",
      username: RandomGenerator.alphabets(10),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator2);

  // 3. Authenticate as first moderator (connection now has their token)
  typia.assert(moderator1.token);

  // 4. Retrieve audit log sorted by moderator_id ascending
  const auditLogAsc =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          order_by: "moderator_id",
          order_direction: "asc",
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(auditLogAsc);

  // 5. Verify pagination structure
  TestValidator.predicate(
    "audit log response has pagination info",
    () =>
      auditLogAsc.pagination !== undefined && auditLogAsc.data !== undefined,
  );

  TestValidator.equals(
    "current page should be 1",
    auditLogAsc.pagination.current,
    1,
  );

  TestValidator.predicate(
    "limit should be positive",
    auditLogAsc.pagination.limit > 0,
  );

  TestValidator.predicate(
    "total records should be non-negative",
    auditLogAsc.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages should be positive",
    auditLogAsc.pagination.pages >= 0,
  );

  // 6. Verify data structure for each audit log entry
  if (auditLogAsc.data.length > 0) {
    const firstEntry = auditLogAsc.data[0];
    typia.assert(firstEntry);

    TestValidator.predicate(
      "audit log entry has id",
      () => firstEntry.id !== undefined && firstEntry.id !== null,
    );

    TestValidator.predicate(
      "audit log entry has action_type",
      () =>
        firstEntry.action_type !== undefined && firstEntry.action_type !== null,
    );

    TestValidator.predicate(
      "audit log entry has moderator info",
      () =>
        firstEntry.moderator !== undefined &&
        firstEntry.moderator.id !== undefined,
    );

    TestValidator.predicate(
      "audit log entry has created_at timestamp",
      () =>
        firstEntry.created_at !== undefined && firstEntry.created_at !== null,
    );
  }

  // 7. Retrieve audit log sorted by moderator_id descending
  const auditLogDesc =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          order_by: "moderator_id",
          order_direction: "desc",
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(auditLogDesc);

  // 8. Verify both responses have valid data
  TestValidator.predicate("audit log response is array", () =>
    Array.isArray(auditLogDesc.data),
  );

  TestValidator.predicate(
    "audit log asc and desc have same pagination limit",
    auditLogAsc.pagination.limit === auditLogDesc.pagination.limit,
  );

  // 9. Verify moderator sorting is working by checking if moderator IDs follow sort order
  if (auditLogAsc.data.length > 1) {
    // For ascending order, each moderator ID should be >= previous
    for (let i = 1; i < auditLogAsc.data.length; i++) {
      const currentModId = auditLogAsc.data[i].moderator.id;
      const prevModId = auditLogAsc.data[i - 1].moderator.id;

      TestValidator.predicate(
        `entry ${i} moderator_id >= entry ${i - 1} in ascending sort`,
        () => currentModId >= prevModId,
      );
    }
  }

  if (auditLogDesc.data.length > 1) {
    // For descending order, each moderator ID should be <= previous
    for (let i = 1; i < auditLogDesc.data.length; i++) {
      const currentModId = auditLogDesc.data[i].moderator.id;
      const prevModId = auditLogDesc.data[i - 1].moderator.id;

      TestValidator.predicate(
        `entry ${i} moderator_id <= entry ${i - 1} in descending sort`,
        () => currentModId <= prevModId,
      );
    }
  }
}
