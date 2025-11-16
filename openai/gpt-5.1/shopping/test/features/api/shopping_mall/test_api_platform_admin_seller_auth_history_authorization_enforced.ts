import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuthLog";
import type { IShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthLog";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSellerPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetRequest";

/**
 * Verify that seller authentication history is only accessible to authenticated
 * platform administrators and that a valid paginated response is returned once
 * authorized.
 *
 * Business goals:
 *
 * - Ensure that unauthenticated callers cannot read seller auth logs.
 * - Ensure that a platform admin created via /auth/platformAdmin/join can
 *   successfully query seller auth history.
 * - Exercise the seller password reset flow so that realistic auth events are
 *   generated, even if we cannot deterministically tie them to a specific
 *   sellerId in this isolated test.
 *
 * Test steps:
 *
 * 1. Clone the given connection into an unauthenticated connection by overriding
 *    headers with an empty object, without mutating the original
 *    connection.headers after creation.
 * 2. Using the unauthenticated connection, attempt to call
 *    api.functional.shoppingMall.platformAdmin.sellers.authHistory.index with a
 *    random sellerId and a minimal IShoppingMallAuthLog.IRequest body. Wrap the
 *    call in TestValidator.error with an async callback and await it, asserting
 *    that unauthorized access is rejected at runtime.
 * 3. Still using the unauthenticated connection, send a seller password reset
 *    request via
 *    api.functional.auth.seller.password.reset.request.requestPasswordReset,
 *    constructing the body using
 *    typia.random<IShoppingMallSellerPasswordResetRequest.IRequest>(). Assert
 *    the response with typia.assert to validate type shape.
 * 4. On the original connection, join as a platform admin by calling
 *    api.functional.auth.platformAdmin.join with a well-formed
 *    IShoppingMallPlatformAdminJoin.IRequest:
 *
 *    - Email: random email using typia.random and tags.Format<"email">.
 *    - Name: RandomGenerator.name().
 *    - Password: static string like "P@ssw0rd!".
 *    - Ip: explicitly null.
 *    - Href/referrer: random URIs using typia.random and tags.Format<"uri">.
 *         typia.assert the IShoppingMallPlatformAdmin.IAuthorized result and
 *         rely on the SDK to inject Authorization into the original connection
 *         headers.
 * 5. With the now-authenticated platform admin connection, call
 *    api.functional.shoppingMall.platformAdmin.sellers.authHistory.index again
 *    using the same sellerId as before and a minimal
 *    IShoppingMallAuthLog.IRequest body specifying page and limit (e.g.,
 *    page=1, limit=10). Assert the IPageIShoppingMallAuthLog.ISummary response
 *    with typia.assert.
 * 6. Add business-level assertions:
 *
 *    - Use TestValidator.equals to ensure that pagination.limit equals the requested
 *         limit.
 *    - If the page contains at least one data element, iterate its entries and for
 *         each:
 *
 *         - Assert that actorType is one of the allowed enum values ("guest", "customer",
 *                   "seller", "platformAdmin", "system").
 *         - Assert that occurredAt is a non-empty string, relying on typia.assert for the
 *                   actual date-time format.
 */
export async function test_api_platform_admin_seller_auth_history_authorization_enforced(
  connection: api.IConnection,
) {
  // Prepare a deterministic sellerId placeholder. We don't have
  // seller creation APIs here, but index expects a string, not
  // necessarily a UUID-tagged type.
  const sellerId: string = RandomGenerator.alphaNumeric(16);

  // 1. Build an unauthenticated connection by cloning and overriding
  // headers. Do not mutate the original connection.headers after
  // construction.
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Unauthenticated call must fail. We don't assert status code,
  // only that some error is thrown.
  await TestValidator.error(
    "unauthenticated access to seller auth history must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.sellers.authHistory.index(
        unauthConn,
        {
          sellerId,
          body: {},
        },
      );
    },
  );

  // 3. Trigger a seller password reset request with unauthenticated
  // connection to generate realistic auth log activity.
  const resetResponse: IShoppingMallSellerPasswordResetRequest.IResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      unauthConn,
      {
        body: typia.random<IShoppingMallSellerPasswordResetRequest.IRequest>(),
      },
    );
  typia.assert(resetResponse);

  // 4. Join as a platform admin on the original connection.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "P@ssw0rd!", // simple but non-empty test password
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 5. Authorized call to seller auth history with minimal filters.
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallAuthLog.IRequest;

  const page: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellers.authHistory.index(
      connection,
      {
        sellerId,
        body: requestBody,
      },
    );
  typia.assert(page);

  // 6. Business-level assertions.
  TestValidator.equals(
    "pagination limit should match requested limit",
    requestBody.limit,
    page.pagination.limit,
  );

  if (page.data.length > 0) {
    // Validate basic invariants on returned auth log summaries.
    for (const log of page.data) {
      typia.assert<IShoppingMallAuthLog.ISummary>(log);

      // actorType must be one of allowed enum values.
      const allowedActorTypes = [
        "guest",
        "customer",
        "seller",
        "platformAdmin",
        "system",
      ] as const;
      TestValidator.predicate(
        "auth log actorType should be one of allowed enum values",
        allowedActorTypes.includes(log.actorType),
      );

      // occurredAt must be a non-empty string; typia.assert already
      // ensures date-time format, so we just check non-emptiness.
      TestValidator.predicate(
        "auth log occurredAt should be non-empty",
        typeof log.occurredAt === "string" && log.occurredAt.length > 0,
      );
    }
  }
}
