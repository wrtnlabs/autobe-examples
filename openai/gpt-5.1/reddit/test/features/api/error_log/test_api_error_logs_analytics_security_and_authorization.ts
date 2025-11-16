import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformErrorLog";

/**
 * Validate platform admin authorization for error log analytics endpoint.
 *
 * Business goal: Ensure that the error log analytics endpoint (PATCH
 * /communityPlatform/platformAdmin/analytics/errorLogs) is accessible only to
 * authenticated platform administrators and that unauthenticated callers are
 * rejected. This test focuses purely on authorization and high-level response
 * correctness, not on detailed filtering semantics or HTTP status codes.
 *
 * Scenario steps:
 *
 * 1. Prepare a minimal error log analytics request body using
 *    ICommunityPlatformErrorLog.IRequest with page=1 and limit=10.
 * 2. Using the initial incoming connection (which has not performed any
 *    platformAdmin authentication yet), attempt to call
 *    api.functional.communityPlatform.platformAdmin.analytics.errorLogs.index
 *    with the minimal body inside TestValidator.error, asserting that some
 *    error is thrown for unauthenticated access. Do not assert on specific
 *    HttpError.status codes or messages.
 * 3. Register a platform admin by calling api.functional.auth.platformAdmin.join
 *    with a valid ICommunityPlatformPlatformadmin.IJoin payload generated from
 *    RandomGenerator and typia.random. This call should succeed and implicitly
 *    attach a valid Authorization token to the same connection instance.
 * 4. Call errorLogs.index again using the now-authenticated original connection
 *    and the same minimal IRequest body. Assert that the call succeeds and
 *    typia.assert that the response matches
 *    IPageICommunityPlatformErrorLog.ISummary.
 * 5. Perform a simple business-level assertion with TestValidator.equals to
 *    confirm that pagination.limit in the response matches the requested limit,
 *    verifying that the server respected the client-provided page size while
 *    authorized.
 */
export async function test_api_error_logs_analytics_security_and_authorization(
  connection: api.IConnection,
) {
  // 1. Prepare minimal analytics request body (page=1, limit=10)
  const body = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformErrorLog.IRequest;

  // 2. Verify that unauthenticated access using the initial connection is rejected
  await TestValidator.error(
    "unauthenticated error log analytics access must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.analytics.errorLogs.index(
        connection,
        { body },
      );
    },
  );

  // 3. Register a new platform admin to obtain an authenticated session
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 4. Call analytics endpoint with authenticated admin connection
  const page =
    await api.functional.communityPlatform.platformAdmin.analytics.errorLogs.index(
      connection,
      { body },
    );
  typia.assert<IPageICommunityPlatformErrorLog.ISummary>(page);

  // 5. Basic business-level assertion: response limit matches requested limit
  TestValidator.equals(
    "error log analytics pagination.limit must equal requested limit",
    page.pagination.limit,
    body.limit,
  );
}
