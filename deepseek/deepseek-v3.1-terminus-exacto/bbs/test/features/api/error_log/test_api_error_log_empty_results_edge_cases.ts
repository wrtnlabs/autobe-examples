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

export async function test_api_error_log_empty_results_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Update connection with authentication token
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: `Bearer ${authResult.token.access}`,
  };
  // Test 1: Search for non-existent error type
  const nonExistentErrorType = RandomGenerator.alphabets(10);
  const response1 =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      {
        body: {
          error_type: nonExistentErrorType,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(response1);
  TestValidator.equals(
    "empty data for non-existent error type",
    response1.data,
    [],
  );
  // Test 2: Filter by future date range
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const response2 =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      {
        body: {
          occurred_at_from: futureDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(response2);
  TestValidator.equals("empty data for future date range", response2.data, []);
  // Test 3: Combine conflicting filters
  const response3 =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      {
        body: {
          error_type: "database",
          severity: "info",
          environment: "production",
          component: "api",
          request_path: "/non-existent-path",
          search: RandomGenerator.alphabets(20),
          occurred_at_from: futureDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals(
    "empty data for conflicting filters",
    response3.data,
    [],
  );
  // Test 4: Search for random non-existent text
  const randomText = RandomGenerator.paragraph({ sentences: 2 });
  const response4 =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      {
        body: {
          search: randomText,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(response4);
  TestValidator.equals("empty data for random text search", response4.data, []);
  // Test 5: Empty search with all null filters
  const response5 =
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
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(response5);
  TestValidator.predicate(
    "has valid pagination metadata",
    Array.isArray(response5.data),
  );
}
