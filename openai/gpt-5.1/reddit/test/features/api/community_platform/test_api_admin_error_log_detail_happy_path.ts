import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformErrorLog";

/**
 * Happy path: admin drills down from error log list to a specific error log
 * detail.
 *
 * Business flow:
 *
 * 1. Register a new admin user (join) and obtain authorized context (JWT handled
 *    by SDK).
 * 2. Create a system configuration row to simulate configured
 *    logging/observability.
 * 3. Query error logs with reasonable filters/pagination to obtain a page of
 *    summaries.
 * 4. Pick one summary entry and fetch its detailed record by id.
 * 5. Assert that identity fields in detail match the summary and required fields
 *    are non-null.
 */
export async function test_api_admin_error_log_detail_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create a system configuration entry as precondition
  const systemConfigBody = {
    category: "logging",
    config_key: "error_log_retention_days",
    value: "30",
    description: "Retention period for error logs in days",
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const systemConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      { body: systemConfigBody },
    );
  typia.assert<ICommunityPlatformSystemConfig>(systemConfig);

  // 3. Search error logs (index) with simple pagination and sorting
  const now = new Date();
  const occurredFrom = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const occurredTo = now.toISOString();

  const searchBody = {
    occurredFrom,
    occurredTo,
    service_name: null,
    environment: null,
    severity: null,
    error_code: null,
    exception_name: null,
    correlation_id: null,
    query: null,
    page: 1,
    limit: 10,
    sortBy: "occurred_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformErrorLog.IRequest;

  const page: IPageICommunityPlatformErrorLog.ISummary =
    await api.functional.communityPlatform.adminUser.errorLogs.index(
      connection,
      { body: searchBody },
    );
  typia.assert<IPageICommunityPlatformErrorLog.ISummary>(page);
  typia.assert<IPage.IPagination>(page.pagination);

  TestValidator.predicate(
    "error log index should return at least one record for detail drill-down",
    page.data.length > 0,
  );

  const summary: ICommunityPlatformErrorLog.ISummary = page.data[0];
  typia.assert<ICommunityPlatformErrorLog.ISummary>(summary);

  // 4. Fetch detailed record by id
  const detail: ICommunityPlatformErrorLog =
    await api.functional.communityPlatform.adminUser.errorLogs.at(connection, {
      errorLogId: summary.id,
    });
  typia.assert<ICommunityPlatformErrorLog>(detail);

  // 5. Validate identity consistency and required fields
  TestValidator.equals(
    "detailed error log id should equal summary id",
    detail.id,
    summary.id,
  );
  TestValidator.equals(
    "detailed error log service_name should equal summary service_name",
    detail.service_name,
    summary.service_name,
  );
  TestValidator.equals(
    "detailed error log environment should equal summary environment",
    detail.environment,
    summary.environment,
  );
  TestValidator.equals(
    "detailed error log severity should equal summary severity",
    detail.severity,
    summary.severity,
  );
  TestValidator.equals(
    "detailed error log occurred_at should equal summary occurred_at",
    detail.occurred_at,
    summary.occurred_at,
  );

  // Optional fields: if summary has non-null values, detail must match them
  if (summary.error_code !== null && summary.error_code !== undefined) {
    TestValidator.equals(
      "detailed error log error_code should equal summary error_code when present",
      detail.error_code ?? null,
      summary.error_code,
    );
  }
  if (summary.exception_name !== null && summary.exception_name !== undefined) {
    TestValidator.equals(
      "detailed error log exception_name should equal summary exception_name when present",
      detail.exception_name ?? null,
      summary.exception_name,
    );
  }
  if (summary.context !== null && summary.context !== undefined) {
    TestValidator.equals(
      "detailed error log context should equal summary context when present",
      detail.context ?? null,
      summary.context,
    );
  }
  if (summary.correlation_id !== null && summary.correlation_id !== undefined) {
    TestValidator.equals(
      "detailed error log correlation_id should equal summary correlation_id when present",
      detail.correlation_id ?? null,
      summary.correlation_id,
    );
  }
}
