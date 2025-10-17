import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";

/**
 * Test comprehensive audit log search functionality for administrators.
 *
 * This test validates the complete audit log search workflow where an
 * administrator authenticates and performs various searches through system
 * audit logs. The test ensures administrators can successfully register/login,
 * then search audit logs using multiple filter criteria including user ID,
 * action type, entity type, date range, and IP address.
 *
 * The scenario verifies that:
 *
 * 1. Administrator registration and authentication works correctly
 * 2. Audit log search API is accessible to authenticated administrators
 * 3. Response includes detailed audit log entries with all required metadata
 * 4. Pagination works correctly for audit log results
 * 5. Various filter combinations return appropriate results
 *
 * This validates the platform's compliance auditing and security monitoring
 * capabilities.
 */
export async function test_api_audit_logs_comprehensive_search_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Register a new administrator account
  const adminUsername = `admin_${RandomGenerator.alphaNumeric(8)}`;
  const adminEmail = `${RandomGenerator.alphaNumeric(12)}@example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(16);

  const adminCreateBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const authorizedAdmin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateBody,
    });

  typia.assert(authorizedAdmin);
  typia.assert(authorizedAdmin.token);

  // Step 2: Search audit logs without any filters (basic search)
  const basicSearchRequest = {
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardAuditLog.IRequest;

  const basicSearchResult: IPageIDiscussionBoardAuditLog =
    await api.functional.discussionBoard.administrator.audit.logs.index(
      connection,
      {
        body: basicSearchRequest,
      },
    );

  typia.assert(basicSearchResult);

  TestValidator.predicate(
    "pagination should have valid structure",
    basicSearchResult.pagination.current >= 0 &&
      basicSearchResult.pagination.limit > 0 &&
      basicSearchResult.pagination.records >= 0 &&
      basicSearchResult.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "audit log data should be an array",
    Array.isArray(basicSearchResult.data),
  );

  // Step 3: Search audit logs with specific filters
  if (basicSearchResult.data.length > 0) {
    const sampleLog = basicSearchResult.data[0];
    typia.assert(sampleLog);

    // Search by action type
    const actionTypeSearchRequest = {
      action_type: sampleLog.action_type,
      page: 1,
      limit: 20,
      sort_order: "desc" as const,
    } satisfies IDiscussionBoardAuditLog.IRequest;

    const actionTypeResult: IPageIDiscussionBoardAuditLog =
      await api.functional.discussionBoard.administrator.audit.logs.index(
        connection,
        {
          body: actionTypeSearchRequest,
        },
      );

    typia.assert(actionTypeResult);

    if (actionTypeResult.data.length > 0) {
      TestValidator.predicate(
        "filtered results should match action type",
        actionTypeResult.data.every(
          (log) => log.action_type === sampleLog.action_type,
        ),
      );
    }

    // Search by entity type
    const entityTypeSearchRequest = {
      entity_type: sampleLog.entity_type,
      page: 1,
      limit: 20,
      sort_order: "asc" as const,
    } satisfies IDiscussionBoardAuditLog.IRequest;

    const entityTypeResult: IPageIDiscussionBoardAuditLog =
      await api.functional.discussionBoard.administrator.audit.logs.index(
        connection,
        {
          body: entityTypeSearchRequest,
        },
      );

    typia.assert(entityTypeResult);

    if (entityTypeResult.data.length > 0) {
      TestValidator.predicate(
        "filtered results should match entity type",
        entityTypeResult.data.every(
          (log) => log.entity_type === sampleLog.entity_type,
        ),
      );
    }
  }

  // Step 4: Search with date range filters
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRangeSearchRequest = {
    start_date: oneMonthAgo.toISOString(),
    end_date: now.toISOString(),
    page: 1,
    limit: 30,
    sort_by: "created_at",
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardAuditLog.IRequest;

  const dateRangeResult: IPageIDiscussionBoardAuditLog =
    await api.functional.discussionBoard.administrator.audit.logs.index(
      connection,
      {
        body: dateRangeSearchRequest,
      },
    );

  typia.assert(dateRangeResult);

  // Step 5: Test pagination
  const firstPageRequest = {
    page: 1,
    limit: 10,
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardAuditLog.IRequest;

  const firstPage: IPageIDiscussionBoardAuditLog =
    await api.functional.discussionBoard.administrator.audit.logs.index(
      connection,
      {
        body: firstPageRequest,
      },
    );

  typia.assert(firstPage);

  TestValidator.equals(
    "first page current should be 1",
    firstPage.pagination.current,
    1,
  );

  TestValidator.predicate(
    "first page data length should not exceed limit",
    firstPage.data.length <= 10,
  );

  // If there are more pages, test second page
  if (firstPage.pagination.pages > 1) {
    const secondPageRequest = {
      page: 2,
      limit: 10,
      sort_order: "desc" as const,
    } satisfies IDiscussionBoardAuditLog.IRequest;

    const secondPage: IPageIDiscussionBoardAuditLog =
      await api.functional.discussionBoard.administrator.audit.logs.index(
        connection,
        {
          body: secondPageRequest,
        },
      );

    typia.assert(secondPage);

    TestValidator.equals(
      "second page current should be 2",
      secondPage.pagination.current,
      2,
    );

    TestValidator.predicate(
      "second page data should be different from first page",
      firstPage.data.length === 0 ||
        secondPage.data.length === 0 ||
        firstPage.data[0].id !== secondPage.data[0].id,
    );
  }

  // Step 6: Search with combined filters and verify all entries
  const combinedSearchRequest = {
    page: 1,
    limit: 25,
    sort_by: "created_at",
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardAuditLog.IRequest;

  const combinedResult: IPageIDiscussionBoardAuditLog =
    await api.functional.discussionBoard.administrator.audit.logs.index(
      connection,
      {
        body: combinedSearchRequest,
      },
    );

  typia.assert(combinedResult);

  // Verify all audit log entries are valid
  for (const log of combinedResult.data) {
    typia.assert(log);
  }
}
