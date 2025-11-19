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
 * Test filtering audit log entries by date range for temporal analysis.
 *
 * A moderator authenticates and retrieves audit log entries created between
 * specific date_from and date_to timestamps. This test validates that the audit
 * log filtering API correctly returns only entries within the specified date
 * range, enabling moderators to analyze moderation activity trends, conduct
 * incident investigations, and review compliance for specific time periods.
 *
 * The test workflow:
 *
 * 1. Create a moderator account through authentication join endpoint
 * 2. Query audit log without date filters to get baseline data
 * 3. Query audit log with a recent date range (last 7 days)
 * 4. Query audit log with a wider date range (last 30 days)
 * 5. Query audit log with a narrow future date range (should return empty)
 * 6. Validate that results respect the date_from and date_to boundaries
 * 7. Verify pagination information is consistent across different date ranges
 * 8. Test individual date_from and date_to filters
 */
export async function test_api_moderation_audit_log_filter_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account should be created with active status",
    moderator.account_status === "active",
  );
  TestValidator.predicate(
    "moderator should have full moderation tier",
    moderator.moderation_tier === "full",
  );

  // Step 2: Query audit log without date filters to get baseline
  const baselineResult: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(baselineResult);
  TestValidator.predicate(
    "baseline audit log query should return valid page structure",
    baselineResult.pagination !== null && baselineResult.data !== null,
  );

  // Step 3: Query audit log with recent date range (last 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentResult: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          date_from: sevenDaysAgo.toISOString(),
          date_to: now.toISOString(),
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(recentResult);

  // Validate all returned entries fall within the date range
  if (recentResult.data.length > 0) {
    recentResult.data.forEach((entry) => {
      const entryDate = new Date(entry.created_at);
      TestValidator.predicate(
        "audit log entry created_at should be >= date_from",
        entryDate >= sevenDaysAgo,
      );
      TestValidator.predicate(
        "audit log entry created_at should be <= date_to",
        entryDate <= now,
      );
    });
  }

  // Step 4: Query audit log with wider date range (last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const widerResult: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          date_from: thirtyDaysAgo.toISOString(),
          date_to: now.toISOString(),
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(widerResult);

  // The 30-day range should return >= results compared to 7-day range
  TestValidator.predicate(
    "30-day range should return at least as many records as 7-day range",
    widerResult.data.length >= recentResult.data.length,
  );

  // Step 5: Query audit log with future date range (should return empty)
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterTomorrow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const futureResult: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          date_from: tomorrow.toISOString(),
          date_to: dayAfterTomorrow.toISOString(),
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(futureResult);
  TestValidator.predicate(
    "future date range should return no records",
    futureResult.data.length === 0,
  );

  // Step 6: Validate pagination structure consistency
  TestValidator.predicate(
    "pagination current page should be >= 1",
    recentResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be > 0",
    recentResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    recentResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    recentResult.pagination.pages >= 0,
  );

  // Step 7: Test with only date_from (no date_to)
  const onlyFromResult: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          date_from: sevenDaysAgo.toISOString(),
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(onlyFromResult);

  if (onlyFromResult.data.length > 0) {
    onlyFromResult.data.forEach((entry) => {
      const entryDate = new Date(entry.created_at);
      TestValidator.predicate(
        "audit log entry should respect date_from when date_to is omitted",
        entryDate >= sevenDaysAgo,
      );
    });
  }

  // Step 8: Test with only date_to (no date_from)
  const onlyToResult: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          date_to: now.toISOString(),
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(onlyToResult);

  if (onlyToResult.data.length > 0) {
    onlyToResult.data.forEach((entry) => {
      const entryDate = new Date(entry.created_at);
      TestValidator.predicate(
        "audit log entry should respect date_to when date_from is omitted",
        entryDate <= now,
      );
    });
  }
}
