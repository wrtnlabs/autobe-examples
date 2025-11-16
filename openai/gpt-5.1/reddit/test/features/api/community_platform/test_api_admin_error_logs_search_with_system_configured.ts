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
 * Validate that an authenticated adminUser can search and paginate error logs
 * when system logging configuration is present.
 *
 * Business flow:
 *
 * 1. Join as a new adminUser and obtain an authorized admin context.
 * 2. Create a system configuration row to represent logging/observability setup.
 * 3. Query error logs with a filtered, paginated request body.
 * 4. Validate pagination metadata and that each record matches filter criteria.
 * 5. Perform a second, stricter query and validate subset behavior.
 */
export async function test_api_admin_error_logs_search_with_system_configured(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (join) to obtain authenticated admin context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create a system configuration entry to simulate logging configuration
  const systemConfigBody = {
    category: "observability",
    config_key: "error_logging.enabled",
    value: "true",
    description: "Enable error logging for admin observability tests",
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const systemConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      { body: systemConfigBody },
    );
  typia.assert<ICommunityPlatformSystemConfig>(systemConfig);

  // 3. Prepare base filter window and parameters for error log search
  const occurredTo: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const occurredFromDate = new Date(Date.now() - 1000 * 60 * 60 * 24);
  const occurredFrom: string & tags.Format<"date-time"> =
    occurredFromDate.toISOString() as string & tags.Format<"date-time">;

  const serviceName = "community_service";
  const environment = "production";

  const page = 1 as number & tags.Type<"int32">;
  const limit = 20 as number & tags.Type<"int32">;

  const baseRequest = {
    occurredFrom,
    occurredTo,
    service_name: serviceName,
    environment,
    page,
    limit,
    sortBy: "occurred_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformErrorLog.IRequest;

  // 4. Call errorLogs.index with base filter
  const firstPage: IPageICommunityPlatformErrorLog.ISummary =
    await api.functional.communityPlatform.adminUser.errorLogs.index(
      connection,
      { body: baseRequest },
    );
  typia.assert<IPageICommunityPlatformErrorLog.ISummary>(firstPage);

  const pagination1 = firstPage.pagination;
  const data1 = firstPage.data;

  // Validate pagination metadata consistency
  TestValidator.equals(
    "pagination.current should equal requested page or default to 1",
    page,
    pagination1.current,
  );
  TestValidator.equals(
    "pagination.limit should equal requested limit",
    limit,
    pagination1.limit,
  );
  TestValidator.predicate(
    "pagination.records non-negative",
    () => pagination1.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages non-negative",
    () => pagination1.pages >= 0,
  );

  // If any records returned, basic consistency between records and data length
  if (data1.length > 0) {
    TestValidator.predicate(
      "records should be at least data length when non-empty",
      () => pagination1.records >= data1.length,
    );
  }

  // Validate each returned error log summary against filter conditions
  for (const item of data1) {
    // Required fields are non-null and non-empty
    TestValidator.predicate(
      "errorLog.id should be non-empty",
      () => typeof item.id === "string" && item.id.length > 0,
    );
    TestValidator.predicate(
      "errorLog.service_name should match filter",
      () => item.service_name === serviceName,
    );
    TestValidator.predicate(
      "errorLog.environment should match filter",
      () => item.environment === environment,
    );
    TestValidator.predicate(
      "errorLog.message non-empty",
      () => typeof item.message === "string" && item.message.length > 0,
    );
    TestValidator.predicate(
      "errorLog.severity non-empty",
      () => typeof item.severity === "string" && item.severity.length > 0,
    );

    // occurred_at within requested window
    const occurredAtTime = new Date(item.occurred_at).getTime();
    const fromTime = occurredFromDate.getTime();
    const toTime = new Date(occurredTo).getTime();
    TestValidator.predicate(
      "errorLog.occurred_at within [occurredFrom, occurredTo]",
      () => occurredAtTime >= fromTime && occurredAtTime <= toTime,
    );
  }

  // 5. Second call with stricter filter (severity)
  const severityFilter = "error";
  const secondRequest = {
    ...baseRequest,
    severity: severityFilter,
  } satisfies ICommunityPlatformErrorLog.IRequest;

  const secondPage: IPageICommunityPlatformErrorLog.ISummary =
    await api.functional.communityPlatform.adminUser.errorLogs.index(
      connection,
      { body: secondRequest },
    );
  typia.assert<IPageICommunityPlatformErrorLog.ISummary>(secondPage);

  const pagination2 = secondPage.pagination;
  const data2 = secondPage.data;

  // Validate pagination metadata for second request
  TestValidator.equals(
    "second pagination.current should equal requested page",
    page,
    pagination2.current,
  );
  TestValidator.equals(
    "second pagination.limit should equal requested limit",
    limit,
    pagination2.limit,
  );

  // Validate each returned item matches both base filters and severity
  for (const item of data2) {
    TestValidator.predicate(
      "second call: service_name should match filter",
      () => item.service_name === serviceName,
    );
    TestValidator.predicate(
      "second call: environment should match filter",
      () => item.environment === environment,
    );
    TestValidator.predicate(
      "second call: severity should match filter",
      () => item.severity === severityFilter,
    );
  }

  // If both result sets are non-empty, assert second set is subset of first by id
  if (data1.length > 0 && data2.length > 0) {
    const firstIds = new Set(data1.map((d) => d.id));
    for (const item of data2) {
      TestValidator.predicate(
        "second result should be subset of first by id",
        () => firstIds.has(item.id),
      );
    }
  }
}
