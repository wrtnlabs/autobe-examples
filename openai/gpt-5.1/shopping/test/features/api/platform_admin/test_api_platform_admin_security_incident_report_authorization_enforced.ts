import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSecurityIncidentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityIncidentReport";
import type { IShoppingMallSecurityIncidentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityIncidentSummary";

/**
 * Verify that security incident report access is restricted to authenticated
 * platform administrators.
 *
 * Business purpose: This test ensures that sensitive security incident data,
 * derived from system logging tables, is not exposed to unauthenticated
 * callers. Only properly authenticated platform administrators should be able
 * to query the reporting endpoint. The test covers both the negative path (no
 * auth) and the positive path (valid platformAdmin join).
 *
 * Steps:
 *
 * 1. Build a minimal but valid IShoppingMallSecurityIncidentReport.IRequest body,
 *    using a small time window and simple pagination parameters.
 * 2. Create an unauthenticated connection by cloning the provided connection and
 *    forcing headers to an empty object so that no Authorization header is
 *    sent.
 * 3. Call PATCH /shoppingMall/platformAdmin/reports/logging/securityIncidents
 *    through
 *    api.functional.shoppingMall.platformAdmin.reports.logging.securityIncidents.index
 *    with the unauthenticated connection and request body.
 * 4. Assert that the call fails with an HTTP authorization-related error (status
 *    401 or 403) using TestValidator.httpError, confirming that unauthenticated
 *    access is blocked.
 * 5. Generate a random, valid IShoppingMallPlatformAdminJoin.IRequest using
 *    typia.random and call api.functional.auth.platformAdmin.join with the
 *    original connection to register and authenticate a platform admin. The SDK
 *    will set connection.headers.Authorization with the issued access token.
 * 6. Assert that the join response is a valid
 *    IShoppingMallPlatformAdmin.IAuthorized object via typia.assert.
 * 7. Using the now-authenticated connection, call the incident report endpoint
 *    again with the same request body.
 * 8. Assert that the call succeeds and that the response matches
 *    IShoppingMallSecurityIncidentReport via typia.assert, relying on typia for
 *    complete shape and format validation.
 */
export async function test_api_platform_admin_security_incident_report_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Build a minimal but valid incident report request body.
  const from: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const toDate = new Date(Date.now() + 5 * 60 * 1000);
  const to: string & tags.Format<"date-time"> = toDate.toISOString() as string &
    tags.Format<"date-time">;

  const requestBody = {
    from,
    to,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallSecurityIncidentReport.IRequest;

  // 2. Prepare an unauthenticated connection by removing headers.
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3-4. Unauthenticated call must fail with 401 or 403.
  await TestValidator.httpError(
    "security incident report requires authentication",
    [401, 403],
    async () => {
      return await api.functional.shoppingMall.platformAdmin.reports.logging.securityIncidents.index(
        unauthConnection,
        { body: requestBody },
      );
    },
  );

  // 5. Join as platform admin using the original connection.
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 7-8. Authenticated call should succeed and return a valid report.
  const report =
    await api.functional.shoppingMall.platformAdmin.reports.logging.securityIncidents.index(
      connection,
      { body: requestBody },
    );
  typia.assert<IShoppingMallSecurityIncidentReport>(report);
}
