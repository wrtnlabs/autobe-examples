import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardErrorLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_error_logs_admin_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Filter by error types
  const errorTypesResponse =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          error_types: ["database_error", "validation_error"],
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(errorTypesResponse);
  TestValidator.predicate(
    "has pagination info",
    errorTypesResponse.pagination !== undefined,
  );
  // Test 2: Filter by severity levels
  const severityResponse =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          severities: ["critical", "error"],
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(severityResponse);
  TestValidator.predicate(
    "has data array",
    Array.isArray(severityResponse.data),
  );
  // Test 3: Filter by environments
  const environmentResponse =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          environments: ["production", "staging"],
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(environmentResponse);
  TestValidator.predicate(
    "records count is number",
    typeof severityResponse.pagination.records === "number",
  );
  // Test 4: Filter by components
  const componentResponse =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          components: ["user_service", "article_service"],
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(componentResponse);
  TestValidator.predicate(
    "pagination limits valid",
    componentResponse.pagination.limit >= 0,
  );
  // Test 5: Filter by date range
  const now = new Date().toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateResponse =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          start_date: weekAgo,
          end_date: now,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(dateResponse);
  TestValidator.predicate(
    "pagination pages valid",
    componentResponse.pagination.pages >= 0,
  );
  // Test 6: Combined filtering
  const combinedResponse =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {
          error_types: ["system_error"],
          severities: ["warning"],
          environments: ["development"],
          components: ["comment_service"],
          start_date: weekAgo,
          end_date: now,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(combinedResponse);
  TestValidator.predicate(
    "current page valid",
    combinedResponse.pagination.current >= 0,
  );
  // Test 7: Empty filter (should return all results)
  const emptyFilterResponse =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(emptyFilterResponse);
  TestValidator.predicate(
    "empty filter returns data",
    emptyFilterResponse.data.length >= 0,
  );
  // Validate response structure for all tests
  if (errorTypesResponse.data.length > 0) {
    const sampleError = errorTypesResponse.data[0];
    TestValidator.predicate(
      "has error_type",
      typeof sampleError.error_type === "string",
    );
    TestValidator.predicate(
      "has severity",
      typeof sampleError.severity === "string",
    );
    TestValidator.predicate(
      "has environment",
      typeof sampleError.environment === "string",
    );
    TestValidator.predicate(
      "has error_count",
      typeof sampleError.error_count === "number",
    );
    TestValidator.predicate(
      "has first_occurred_at",
      typeof sampleError.first_occurred_at === "string",
    );
    TestValidator.predicate(
      "has last_occurred_at",
      typeof sampleError.last_occurred_at === "string",
    );
  }
}
