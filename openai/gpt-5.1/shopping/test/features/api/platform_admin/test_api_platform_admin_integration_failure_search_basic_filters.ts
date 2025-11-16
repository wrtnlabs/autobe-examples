import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLoggingIntegrationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLoggingIntegrationFailure";
import type { IShoppingMallLoggingIntegrationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoggingIntegrationFailure";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform administrator can search integration failure logs
 * with basic time-range and integration-type filters and receive a paginated
 * list of incident summaries.
 *
 * Business flow:
 *
 * 1. Join as a new platform admin using POST /auth/platformAdmin/join.
 *
 *    - This establishes an authenticated admin context and issues JWT tokens.
 * 2. Build an integration-failure search request with:
 *
 *    - A recent [from, to) window using ISO 8601 date-time strings.
 *    - A small set of integrationTypes (string identifiers).
 *    - Valid page and limit values within the DTO constraints.
 * 3. Call PATCH /shoppingMall/platformAdmin/reports/logging/integrationFailures
 *    with the constructed IRequest body.
 * 4. Assert the response type is
 *    IPageIShoppingMallLoggingIntegrationFailure.ISummary using typia.assert.
 * 5. Validate pagination metadata (current, limit, records, pages) are
 *    non-negative and internally consistent.
 * 6. For each returned IShoppingMallLoggingIntegrationFailure.ISummary item:
 *
 *    - Verify id, occurred_at, provider, integration_type, and error_message are
 *         non-empty strings.
 *    - Verify retryable is a boolean.
 *    - Allow optional fields (status_code, error_code, correlation_id) to be
 *         undefined.
 *    - Confirm occurred_at falls within the requested [from, to) range and
 *         integration_type is one of the requested integrationTypes.
 */
export async function test_api_platform_admin_integration_failure_search_basic_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as platform admin to obtain authenticated context
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Build a recent time window [from, to)
  const now = new Date();
  const toIso = now.toISOString() as string & tags.Format<"date-time">;
  const fromDate = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const fromIso = fromDate.toISOString() as string & tags.Format<"date-time">;

  // 3. Compose IRequest filter with integrationTypes and pagination
  const integrationTypes: string[] = ["payment_provider", "shipping_carrier"];

  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    from: fromIso,
    to: toIso,
    integrationTypes,
  } satisfies IShoppingMallLoggingIntegrationFailure.IRequest;

  // 4. Call the reporting endpoint
  const pageResult: IPageIShoppingMallLoggingIntegrationFailure.ISummary =
    await api.functional.shoppingMall.platformAdmin.reports.logging.integrationFailures.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  // 5. Basic pagination metadata validation
  TestValidator.predicate(
    "pagination current is non-negative",
    () => pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    () => pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => pagination.pages >= 0,
  );

  if (pagination.records === 0) {
    TestValidator.equals(
      "empty result implies no data entries",
      pageResult.data.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "non-zero records implies at least one page",
      () => pagination.pages >= 1,
    );
  }

  // 6. Validate each summary entry against filters and required fields
  for (const item of pageResult.data) {
    typia.assert<IShoppingMallLoggingIntegrationFailure.ISummary>(item);

    TestValidator.predicate(
      "summary id must be non-empty",
      () => item.id.length > 0,
    );

    TestValidator.predicate(
      "summary occurred_at must be non-empty",
      () => item.occurred_at.length > 0,
    );

    TestValidator.predicate(
      "summary provider must be non-empty",
      () => item.provider.length > 0,
    );

    TestValidator.predicate(
      "summary integration_type must be non-empty",
      () => item.integration_type.length > 0,
    );

    TestValidator.predicate(
      "summary error_message must be non-empty",
      () => item.error_message.length > 0,
    );

    TestValidator.predicate(
      "summary retryable is boolean",
      () => typeof item.retryable === "boolean",
    );

    // Filter validation: occurred_at within [from, to)
    const occurredAtDate = new Date(item.occurred_at);
    TestValidator.predicate(
      "occurred_at is within requested time range",
      () => occurredAtDate >= fromDate && occurredAtDate < now,
    );

    // Filter validation: integration_type in requested set
    TestValidator.predicate(
      "integration_type is within requested integrationTypes",
      () => integrationTypes.includes(item.integration_type),
    );
  }
}
