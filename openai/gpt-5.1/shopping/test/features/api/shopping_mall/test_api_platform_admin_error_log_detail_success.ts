import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallErrorLog";
import type { IShoppingMallErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallErrorLog";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_error_log_detail_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform administrator
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    // ip is optional; provide a simple IPv4-like string to exercise the field
    ip: "127.0.0.1",
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Search error logs with a simple, broad request
  const searchRequest = {
    // Use a tiny page size so the test remains efficient and deterministic
    page: 1,
    limit: 5,
    // Other filters left undefined for a broad search
  } satisfies IShoppingMallErrorLog.IRequest;

  const page: IPageIShoppingMallErrorLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.errorLogs.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert<IPageIShoppingMallErrorLog.ISummary>(page);

  // Basic sanity checks on pagination
  TestValidator.predicate(
    "pagination.limit is positive",
    page.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.current is non-negative",
    page.pagination.current >= 0,
  );

  // 3. If there are no error logs, validate that pagination is consistent and exit early
  if (page.data.length === 0) {
    TestValidator.equals(
      "no error logs implies zero records",
      page.pagination.records,
      0,
    );
    TestValidator.equals(
      "no error logs implies zero pages",
      page.pagination.pages,
      0,
    );
    return;
  }

  // Pick the first error log summary
  const summary: IShoppingMallErrorLog.ISummary = page.data[0];
  typia.assert<IShoppingMallErrorLog.ISummary>(summary);

  // 4. Fetch the detailed error log by its id
  const detail: IShoppingMallErrorLog =
    await api.functional.shoppingMall.platformAdmin.errorLogs.at(connection, {
      errorLogId: summary.id,
    });
  typia.assert<IShoppingMallErrorLog>(detail);

  // 5. Validate consistency between summary and detail

  // IDs must match exactly
  TestValidator.equals("detail id matches summary id", detail.id, summary.id);

  // Severity/level should represent the same concept (string); compare directly
  TestValidator.equals(
    "detail level matches summary severity",
    detail.level,
    summary.severity,
  );

  // Error code: optional on both sides; only assert when both are defined
  if (summary.error_code !== undefined && detail.errorCode !== undefined) {
    TestValidator.equals(
      "error code matches between summary and detail",
      detail.errorCode,
      summary.error_code,
    );
  }

  // Message should match exactly
  TestValidator.equals(
    "error message matches between summary and detail",
    detail.message,
    summary.message,
  );

  // Correlation id: optional on both sides; assert equality when both exist
  if (
    summary.correlation_id !== undefined &&
    detail.correlationId !== undefined
  ) {
    TestValidator.equals(
      "correlation id matches between summary and detail",
      detail.correlationId,
      summary.correlation_id,
    );
  }

  // Service name: optional on both sides
  if (summary.service_name !== undefined && detail.serviceName !== undefined) {
    TestValidator.equals(
      "service name matches between summary and detail",
      detail.serviceName,
      summary.service_name,
    );
  }

  // Component name: optional on both sides
  if (
    summary.component_name !== undefined &&
    detail.componentName !== undefined
  ) {
    TestValidator.equals(
      "component name matches between summary and detail",
      detail.componentName,
      summary.component_name,
    );
  }

  // created_at (summary) vs createdAt (detail) should represent the same timestamp
  TestValidator.equals(
    "created timestamp matches between summary and detail",
    detail.createdAt,
    summary.created_at,
  );
}
