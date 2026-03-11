import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test edge cases where audit log searches return empty results or no matching records.
 * Validates scenarios such as searching for audit logs with valid filter criteria that
 * yield no results, date ranges with no activity, or text searches with no matches.
 * Verifies that the system handles these cases gracefully by returning empty data arrays
 * with proper pagination metadata.
 */
export async function test_api_superadmin_audit_logs_empty_results_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Valid actor type that has no audit logs
  const validActorNoResults =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          actorType: "system", // Valid type but likely has no logs in test environment
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(validActorNoResults);
  TestValidator.equals(
    "valid actor type with no logs returns empty data",
    validActorNoResults.data,
    [],
  );
  TestValidator.equals(
    "valid actor type pagination current page",
    validActorNoResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "valid actor type pagination limit",
    validActorNoResults.pagination.limit,
    10,
  );
  TestValidator.equals(
    "valid actor type pagination records",
    validActorNoResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "valid actor type pagination pages",
    validActorNoResults.pagination.pages,
    0,
  );
  // Test 2: Valid action type that has never occurred
  const validActionNoResults =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          actionType: "approve_admin_request", // Valid action type but likely hasn't occurred
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(validActionNoResults);
  TestValidator.equals(
    "valid action type with no logs returns empty data",
    validActionNoResults.data,
    [],
  );
  TestValidator.equals(
    "valid action type pagination current page",
    validActionNoResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "valid action type pagination limit",
    validActionNoResults.pagination.limit,
    5,
  );
  TestValidator.equals(
    "valid action type pagination records",
    validActionNoResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "valid action type pagination pages",
    validActionNoResults.pagination.pages,
    0,
  );
  // Test 3: Future date range
  const futureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 year in future
  const futureDateResult =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          startDate: futureDate,
          endDate: futureDate,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(futureDateResult);
  TestValidator.equals(
    "future date range returns empty data",
    futureDateResult.data,
    [],
  );
  TestValidator.equals(
    "future date range pagination current page",
    futureDateResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "future date range pagination limit",
    futureDateResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "future date range pagination records",
    futureDateResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date range pagination pages",
    futureDateResult.pagination.pages,
    0,
  );
  // Test 4: Text search with no matches
  const uniqueSearchTextResult =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          searchText: RandomGenerator.alphaNumeric(32) + "_unique_no_match",
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(uniqueSearchTextResult);
  TestValidator.equals(
    "unique search text returns empty data",
    uniqueSearchTextResult.data,
    [],
  );
  TestValidator.equals(
    "unique search text pagination current page",
    uniqueSearchTextResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "unique search text pagination limit",
    uniqueSearchTextResult.pagination.limit,
    15,
  );
  TestValidator.equals(
    "unique search text pagination records",
    uniqueSearchTextResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "unique search text pagination pages",
    uniqueSearchTextResult.pagination.pages,
    0,
  );
  // Test 5: Valid IP address that has no audit logs
  const validIpNoResults =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          ipAddress: typia.random<string & tags.Format<"ipv4">>(), // Valid IP but likely no logs
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(validIpNoResults);
  TestValidator.equals(
    "valid IP address with no logs returns empty data",
    validIpNoResults.data,
    [],
  );
  TestValidator.equals(
    "valid IP address pagination current page",
    validIpNoResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "valid IP address pagination limit",
    validIpNoResults.pagination.limit,
    10,
  );
  TestValidator.equals(
    "valid IP address pagination records",
    validIpNoResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "valid IP address pagination pages",
    validIpNoResults.pagination.pages,
    0,
  );
  // Test 6: Valid target type that has no audit logs
  const validTargetNoResults =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          targetType: "admin_request", // Valid target type but likely no logs
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(validTargetNoResults);
  TestValidator.equals(
    "valid target type with no logs returns empty data",
    validTargetNoResults.data,
    [],
  );
  TestValidator.equals(
    "valid target type pagination current page",
    validTargetNoResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "valid target type pagination limit",
    validTargetNoResults.pagination.limit,
    25,
  );
  TestValidator.equals(
    "valid target type pagination records",
    validTargetNoResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "valid target type pagination pages",
    validTargetNoResults.pagination.pages,
    0,
  );
  // Test 7: Very early date range (likely before any audit logs)
  const earlyDateResult =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          startDate: "2020-01-01T00:00:00.000Z", // Reasonably early date
          endDate: "2020-01-02T00:00:00.000Z",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(earlyDateResult);
  TestValidator.equals(
    "early date range returns empty data",
    earlyDateResult.data,
    [],
  );
  TestValidator.equals(
    "early date range pagination current page",
    earlyDateResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "early date range pagination limit",
    earlyDateResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "early date range pagination records",
    earlyDateResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "early date range pagination pages",
    earlyDateResult.pagination.pages,
    0,
  );
  // Test 8: Combination of valid filters that yield no results
  const combinationResult =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          actorType: "member",
          actionType: "delete_article",
          targetType: "section",
          startDate: futureDate,
          searchText: "combination_no_results_123",
          page: 1,
          limit: 30,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(combinationResult);
  TestValidator.equals(
    "combination filter returns empty data",
    combinationResult.data,
    [],
  );
  TestValidator.equals(
    "combination filter pagination current page",
    combinationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "combination filter pagination limit",
    combinationResult.pagination.limit,
    30,
  );
  TestValidator.equals(
    "combination filter pagination records",
    combinationResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "combination filter pagination pages",
    combinationResult.pagination.pages,
    0,
  );
}
