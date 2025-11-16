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
 * Validate access control for integration event log detail endpoint.
 *
 * Business goal: Ensure that the sensitive integration event log detail API
 * `/shoppingMall/platformAdmin/integrationEventLogs/{integrationEventLogId}` is
 * only accessible to authenticated platform administrators and that
 * unauthenticated requests are rejected.
 *
 * Steps:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join.
 *
 *    - SDK automatically stores the admin access token on the connection.
 * 2. Trigger an integration event by calling the customer password reset request
 *    endpoint POST /auth/customer/password/reset/request with a random email.
 * 3. As the authenticated platform admin, call PATCH
 *    /shoppingMall/platformAdmin/integrationEventLogs to fetch a paginated list
 *    of integration event logs and pick one `integrationEventLogId`.
 * 4. Create an unauthenticated connection (clone of the original with empty
 *    headers) and call the detail endpoint with that connection.
 *
 *    - Validate with TestValidator.httpError that an HTTP error occurs
 *         (authentication/authorization failure).
 * 5. Call the same detail endpoint using the original authenticated connection and
 *    assert that:
 *
 *    - The response is a valid IShoppingMallIntegrationEventLog via typia.assert.
 *    - The returned log `id` matches the summary id chosen from step 3.
 */
export async function test_api_platform_admin_integration_event_log_detail_access_control(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator to obtain an authenticated session
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Trigger a customer password reset event to generate an integration log
  const resetBody = {
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const resetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      { body: resetBody },
    );
  typia.assert(resetResult);

  // 3. Search for integration event logs as the authenticated platform admin
  const searchBody = {
    // keep filters minimal: just request first page with a small limit
    page: 1,
    limit: 10,
  } satisfies IShoppingMallIntegrationEventLog.IRequest;

  const pageResult: IPageIShoppingMallIntegrationEventLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.integrationEventLogs.index(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(pageResult);

  // Ensure we have at least one log entry to test with
  await TestValidator.predicate(
    "integration event logs must not be empty",
    async () => pageResult.data.length > 0,
  );

  const targetSummary: IShoppingMallIntegrationEventLog.ISummary =
    pageResult.data[0];

  // 4. Attempt to fetch detail with an unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "unauthenticated access to integration event log detail must fail",
    [401, 403, 404, 500],
    async () => {
      await api.functional.shoppingMall.platformAdmin.integrationEventLogs.at(
        unauthenticatedConnection,
        {
          integrationEventLogId: targetSummary.id,
        },
      );
    },
  );

  // 5. Fetch the same detail successfully with the authenticated admin
  const detail: IShoppingMallIntegrationEventLog =
    await api.functional.shoppingMall.platformAdmin.integrationEventLogs.at(
      connection,
      {
        integrationEventLogId: targetSummary.id,
      },
    );
  typia.assert(detail);

  // Validate that the detail record matches the selected summary
  TestValidator.equals(
    "integration event log detail id must match summary id",
    detail.id,
    targetSummary.id,
  );
}
