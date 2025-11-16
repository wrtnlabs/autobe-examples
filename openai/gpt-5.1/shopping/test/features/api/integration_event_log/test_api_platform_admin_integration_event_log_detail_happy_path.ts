import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallIntegrationEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallIntegrationEventLog";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallIntegrationEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallIntegrationEventLog";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Happy-path E2E: platform admin drills down from integration event log index
 * to detail.
 *
 * Business goal
 *
 * - Ensure a platform administrator can:
 *
 *   1. Register and obtain an authenticated admin session
 *   2. Trigger a real integration event (customer password reset request)
 *   3. Discover that event through the paginated search endpoint
 *   4. Retrieve the full detail record by id
 *   5. Validate consistency between summary and detail DTOs
 *
 * Covered APIs
 *
 * - POST /auth/platformAdmin/join -> api.functional.auth.platformAdmin.join
 * - POST /auth/customer/password/reset/request ->
 *   api.functional.auth.customer.password.reset.request.requestPasswordReset
 * - PATCH /shoppingMall/platformAdmin/integrationEventLogs ->
 *   api.functional.shoppingMall.platformAdmin.integrationEventLogs.index
 * - GET /shoppingMall/platformAdmin/integrationEventLogs/{integrationEventLogId}
 *   -> api.functional.shoppingMall.platformAdmin.integrationEventLogs.at
 *
 * High-level flow
 *
 * 1. Join a new platform admin using random but valid data, rely on SDK to set
 *    Authorization header.
 * 2. Trigger a customer password reset request using a random customer email.
 * 3. Perform a broad search over integration event logs using a recent time window
 *    and a small page size.
 * 4. If no data is returned, trigger another password reset and retry the search
 *    once.
 * 5. Pick the first summary entry from the resulting page and call the detail
 *    endpoint by its id.
 * 6. Assert that:
 *
 *    - Detail response conforms to IShoppingMallIntegrationEventLog via
 *         typia.assert.
 *    - Id, provider_type, event_type, direction, status, created_at match exactly
 *         between summary and detail.
 *    - For each optional mirrored field, if the summary value is non-null/defined,
 *         the detail value is strictly equal.
 * 7. Focus only on the happy-path with a valid platformAdmin session. Do not
 *    attempt negative auth tests that would require manipulating
 *    connection.headers directly.
 */
export async function test_api_platform_admin_integration_event_log_detail_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and establish an authenticated session.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "platform admin account is active",
    admin.isActive === true,
  );

  // 2. Trigger at least one integration event through customer password reset.
  const resetRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const resetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      { body: resetRequestBody },
    );
  typia.assert(resetResult);

  // Utility to perform a single index search with broad filters.
  const searchOnce = async () => {
    const now = new Date();
    const from = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // last hour
    const to = now.toISOString();

    const indexRequestBody = {
      page: 1 as number & tags.Type<"int32">,
      limit: 20 as number & tags.Type<"int32">,
      from,
      to,
      eventTypes: undefined,
      externalSystems: undefined,
      directions: undefined,
      providerTypes: undefined,
      providerNames: undefined,
      statuses: undefined,
      httpStatusCodes: undefined,
      requestIds: undefined,
      providerRequestIds: undefined,
      providerResponseIds: undefined,
      errorCodes: undefined,
      correlationIds: undefined,
      search: undefined,
      orderBy: undefined,
      orderDirection: undefined,
    } satisfies IShoppingMallIntegrationEventLog.IRequest;

    const page: IPageIShoppingMallIntegrationEventLog.ISummary =
      await api.functional.shoppingMall.platformAdmin.integrationEventLogs.index(
        connection,
        { body: indexRequestBody },
      );
    typia.assert(page);
    return page;
  };

  // 3. Perform search; if empty, trigger another reset and retry once.
  let page = await searchOnce();

  if (page.data.length === 0) {
    const secondResetBody = {
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

    const secondResetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
      await api.functional.auth.customer.password.reset.request.requestPasswordReset(
        connection,
        { body: secondResetBody },
      );
    typia.assert(secondResetResult);

    page = await searchOnce();
  }

  TestValidator.predicate(
    "integration event search must return at least one record after triggering password reset(s)",
    page.data.length > 0,
  );

  const summary: IShoppingMallIntegrationEventLog.ISummary = page.data[0];
  typia.assert(summary);

  // 4. Retrieve detail by id using the admin session.
  const detail: IShoppingMallIntegrationEventLog =
    await api.functional.shoppingMall.platformAdmin.integrationEventLogs.at(
      connection,
      { integrationEventLogId: summary.id },
    );
  typia.assert(detail);

  // 5. Validate identity and core fields consistency.
  TestValidator.equals("detail.id matches summary.id", detail.id, summary.id);
  TestValidator.equals(
    "detail.provider_type matches summary.provider_type",
    detail.provider_type,
    summary.provider_type,
  );
  TestValidator.equals(
    "detail.event_type matches summary.event_type",
    detail.event_type,
    summary.event_type,
  );
  TestValidator.equals(
    "detail.direction matches summary.direction",
    detail.direction,
    summary.direction,
  );
  TestValidator.equals(
    "detail.status matches summary.status",
    detail.status,
    summary.status,
  );
  TestValidator.equals(
    "detail.created_at matches summary.created_at",
    detail.created_at,
    summary.created_at,
  );

  // 6. Validate optional mirrored fields only when summary side is non-null/defined.
  if (summary.provider_name !== null && summary.provider_name !== undefined) {
    TestValidator.equals(
      "detail.provider_name equals summary.provider_name when summary has value",
      detail.provider_name,
      summary.provider_name,
    );
  }
  if (summary.request_id !== null && summary.request_id !== undefined) {
    TestValidator.equals(
      "detail.request_id equals summary.request_id when summary has value",
      detail.request_id,
      summary.request_id,
    );
  }
  if (
    summary.provider_request_id !== null &&
    summary.provider_request_id !== undefined
  ) {
    TestValidator.equals(
      "detail.provider_request_id equals summary.provider_request_id when summary has value",
      detail.provider_request_id,
      summary.provider_request_id,
    );
  }
  if (
    summary.provider_response_id !== null &&
    summary.provider_response_id !== undefined
  ) {
    TestValidator.equals(
      "detail.provider_response_id equals summary.provider_response_id when summary has value",
      detail.provider_response_id,
      summary.provider_response_id,
    );
  }
  if (summary.correlation_id !== null && summary.correlation_id !== undefined) {
    TestValidator.equals(
      "detail.correlation_id equals summary.correlation_id when summary has value",
      detail.correlation_id,
      summary.correlation_id,
    );
  }
  if (
    summary.http_status_code !== null &&
    summary.http_status_code !== undefined
  ) {
    TestValidator.equals(
      "detail.http_status_code equals summary.http_status_code when summary has value",
      detail.http_status_code,
      summary.http_status_code,
    );
  }
  if (summary.latency_ms !== null && summary.latency_ms !== undefined) {
    TestValidator.equals(
      "detail.latency_ms equals summary.latency_ms when summary has value",
      detail.latency_ms,
      summary.latency_ms,
    );
  }
  if (summary.error_code !== null && summary.error_code !== undefined) {
    TestValidator.equals(
      "detail.error_code equals summary.error_code when summary has value",
      detail.error_code,
      summary.error_code,
    );
  }
  if (summary.error_message !== null && summary.error_message !== undefined) {
    TestValidator.equals(
      "detail.error_message equals summary.error_message when summary has value",
      detail.error_message,
      summary.error_message,
    );
  }

  // Additional sanity check: detail.created_at must be a non-empty string (already type-validated by typia).
  TestValidator.predicate(
    "detail.created_at must be a non-empty string",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
}
