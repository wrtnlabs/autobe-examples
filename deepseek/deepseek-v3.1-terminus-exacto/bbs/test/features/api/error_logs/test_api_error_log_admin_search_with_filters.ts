import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_error_log_admin_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Test single filter: error_type
  const errorTypeSearch =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          error_type: "database_error",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(errorTypeSearch);
  TestValidator.predicate(
    "returns pagination data",
    errorTypeSearch.pagination.pagination.pagination.pagination.current >= 0,
  );
  // 3. Test single filter: severity
  const severitySearch =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          severity: "high",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(severitySearch);
  // 4. Test single filter: environment
  const environmentSearch =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          environment: "production",
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(environmentSearch);
  // 5. Test single filter: component
  const componentSearch =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          component: "api",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(componentSearch);
  // 6. Test single filter: request_path
  const pathSearch =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          request_path: "/api/users",
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(pathSearch);
  // 7. Test single filter: text search
  const textSearch =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          search: "connection timeout",
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(textSearch);
  // 8. Test date range filtering
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateSearch =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          occurred_at_from: weekAgo.toISOString(),
          occurred_at_to: now.toISOString(),
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(dateSearch);
  // 9. Test multiple filters combined
  const combinedSearch =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          error_type: "validation_error",
          severity: "medium",
          environment: "staging",
          component: "database",
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // 10. Test with null filter values (should return all)
  const nullSearch =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
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
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(nullSearch);
  // 11. Test pagination limits
  const paginationTest =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.predicate(
    "pagination metadata exists",
    paginationTest.pagination.pagination.pagination.pagination.limit === 5,
  );
  // 12. Test with undefined values (using partial request)
  const partialSearch =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 30,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(partialSearch);
  // 13. Validate that at least pagination structure is correct (business logic only)
  if (combinedSearch.data.length > 0) {
    const sample = combinedSearch.data[0];
    typia.assert(sample);
    // Only test business logic, not type validation
    TestValidator.predicate("has id field", sample.id.length > 0);
    TestValidator.predicate(
      "has occurred_at field",
      sample.occurred_at.length > 0,
    );
  }
}
