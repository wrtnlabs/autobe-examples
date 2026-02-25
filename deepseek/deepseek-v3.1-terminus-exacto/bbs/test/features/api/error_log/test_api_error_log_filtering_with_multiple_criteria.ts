import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardErrorLog";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_error_log_filtering_with_multiple_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Test 1: Filter by error_type with random valid value
  const errorTypeResponse =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      {
        body: {
          error_type: RandomGenerator.pick([
            "database",
            "authentication",
            "validation",
            "system",
          ]),
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(errorTypeResponse);
  TestValidator.predicate(
    "error_type filter returns valid response",
    errorTypeResponse.data !== undefined,
  );
  // Test 2: Filter by severity with random valid value
  const severityResponse =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      {
        body: {
          severity: RandomGenerator.pick([
            "critical",
            "warning",
            "error",
            "info",
          ]),
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(severityResponse);
  TestValidator.predicate(
    "severity filter returns valid response",
    severityResponse.data !== undefined,
  );
  // Test 3: Filter by environment with random valid value
  const environmentResponse =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      {
        body: {
          environment: RandomGenerator.pick([
            "production",
            "development",
            "staging",
            "test",
          ]),
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(environmentResponse);
  TestValidator.predicate(
    "environment filter returns valid response",
    environmentResponse.data !== undefined,
  );
  // Test 4: Filter by component with random valid value
  const componentResponse =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      {
        body: {
          component: RandomGenerator.pick([
            "api",
            "frontend",
            "database",
            "backend",
          ]),
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(componentResponse);
  TestValidator.predicate(
    "component filter returns valid response",
    componentResponse.data !== undefined,
  );
  // Test 5: Filter by request_path pattern
  const requestPathResponse =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      {
        body: {
          request_path: "/api",
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(requestPathResponse);
  TestValidator.predicate(
    "request_path filter returns valid response",
    requestPathResponse.data !== undefined,
  );
  // Test 6: Filter by search term
  const searchResponse =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      {
        body: {
          search: "error",
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search filter returns valid response",
    searchResponse.data !== undefined,
  );
  // Test 7: Filter by date range
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      {
        body: {
          occurred_at_from: oneWeekAgo.toISOString(),
          occurred_at_to: now.toISOString(),
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  TestValidator.predicate(
    "date range filter returns valid response",
    dateRangeResponse.data !== undefined,
  );
  // Test 8: Combined filters
  const combinedResponse =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      {
        body: {
          error_type: RandomGenerator.pick(["database", "authentication"]),
          severity: RandomGenerator.pick(["warning", "error"]),
          environment: RandomGenerator.pick(["development", "staging"]),
          component: RandomGenerator.pick(["api", "backend"]),
          occurred_at_from: oneWeekAgo.toISOString(),
          occurred_at_to: now.toISOString(),
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(combinedResponse);
  TestValidator.predicate(
    "combined filters return valid response",
    combinedResponse.data !== undefined,
  );
  // Test 9: Pagination with specific parameters
  const paginationResponse =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.predicate(
    "pagination returns valid response",
    paginationResponse.data !== undefined,
  );
  TestValidator.predicate(
    "pagination data is array",
    Array.isArray(paginationResponse.data),
  );
  // Test 10: Empty filters (should return all)
  const emptyResponse =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      {
        body: {
          error_type: null,
          severity: null,
          environment: null,
          component: null,
          request_path: null,
          search: null,
          occurred_at_from: null,
          occurred_at_to: null,
          page: undefined,
          limit: undefined,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.predicate(
    "empty filters return valid response",
    emptyResponse.data !== undefined,
  );
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    emptyResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination data is array",
    Array.isArray(emptyResponse.data),
  );
  // Validate individual error log entries have required fields
  if (emptyResponse.data.length > 0) {
    const sampleEntry = emptyResponse.data[0];
    TestValidator.predicate(
      "error log has id",
      typeof sampleEntry.id === "string",
    );
    TestValidator.predicate(
      "error log has error_type",
      typeof sampleEntry.error_type === "string",
    );
    TestValidator.predicate(
      "error log has severity",
      typeof sampleEntry.severity === "string",
    );
    TestValidator.predicate(
      "error log has environment",
      typeof sampleEntry.environment === "string",
    );
    TestValidator.predicate(
      "error log has occurred_at",
      typeof sampleEntry.occurred_at === "string",
    );
  }
}
