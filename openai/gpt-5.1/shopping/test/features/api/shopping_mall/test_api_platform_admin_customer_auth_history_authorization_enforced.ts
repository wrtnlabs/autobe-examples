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

/**
 * Ensure customer authentication history endpoint enforces platform admin
 * authorization.
 *
 * Business goal:
 *
 * - Verify that the customer auth-history search endpoint is protected by
 *   admin-only authorization and cannot be invoked from an unauthenticated
 *   context.
 * - Confirm that, once a platform administrator is properly joined (and thus
 *   authenticated by the SDK), the same endpoint successfully returns a
 *   paginated auth-log summary payload.
 *
 * Scenario steps (rewritten to respect SDK and test constraints):
 *
 * 1. Build an unauthenticated connection object derived from the provided
 *    connection (no Authorization header, and we never touch headers after
 *    construction).
 * 2. On this unauthenticated connection, attempt to query a customer auth history
 *    page via
 *    api.functional.shoppingMall.platformAdmin.customers.authHistory.index with
 *    a random customerId and minimal IShoppingMallAuthLog.IRequest body. Expect
 *    the call to fail with some error, validated via TestValidator.error,
 *    without asserting specific HTTP status codes.
 * 3. Using the original connection, call api.functional.auth.platformAdmin.join
 *    with a valid IShoppingMallPlatformAdminJoin.IRequest body to create and
 *    authenticate a platform admin session. The SDK will attach the access
 *    token into the connection headers automatically.
 * 4. With this now-authenticated connection, call the authHistory.index endpoint
 *    again using the same random customerId, but this time with a richer
 *    IShoppingMallAuthLog.IRequest filter (page, limit, actor_type="customer",
 *    actor_id equal to customerId, and sort_by/sort_direction populated).
 * 5. Assert that the response is a valid IPageIShoppingMallAuthLog.ISummary using
 *    typia.assert, and validate basic pagination invariants via TestValidator,
 *    such as non-negative current/limit/records/pages.
 */
export async function test_api_platform_admin_customer_auth_history_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Prepare a synthetic customer ID for the auth-history query.
  const customerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Build a minimal search request body for IShoppingMallAuthLog.IRequest.
  const minimalRequest = {
    page: undefined,
    limit: undefined,
    sort_by: null,
    sort_direction: null,
    actor_type: null,
    actor_id: null,
    event_types: undefined,
    success: null,
    failure_reasons: undefined,
    ip: null,
    user_agent: null,
    created_from: null,
    created_to: null,
  } satisfies IShoppingMallAuthLog.IRequest;

  // 3. Construct an unauthenticated connection by copying only host and options.
  //    We do not carry over headers from the original connection, and we do not
  //    touch headers after creation, respecting the SDK rules.
  const unauthenticatedConnection: api.IConnection = {
    host: (connection as IConnection).host,
    simulate: (connection as IConnection).simulate,
    options: (connection as IConnection).options,
    logger: (connection as IConnection).logger,
  };

  // 4. Ensure that calling the admin-only authHistory endpoint without
  //    authentication fails.
  await TestValidator.error(
    "unauthenticated connection cannot access customer auth history",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customers.authHistory.index(
        unauthenticatedConnection,
        {
          customerId,
          body: minimalRequest,
        },
      );
    },
  );

  // 5. Join as a platform administrator using the original connection.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 6. With the now-authenticated connection, query the auth-history endpoint
  //    again using a richer filter.
  const searchRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "desc",
    actor_type: "customer",
    actor_id: customerId,
    event_types: undefined,
    success: null,
    failure_reasons: undefined,
    ip: null,
    user_agent: null,
    created_from: null,
    created_to: null,
  } satisfies IShoppingMallAuthLog.IRequest;

  const pageResult: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.customers.authHistory.index(
      connection,
      {
        customerId,
        body: searchRequest,
      },
    );
  typia.assert<IPageIShoppingMallAuthLog.ISummary>(pageResult);

  // 7. Basic pagination sanity checks.
  const pagination = pageResult.pagination;
  TestValidator.predicate(
    "pagination current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );

  // 8. Validate that every log summary in the pageResult.data is structurally
  //    correct (typia.assert already does this) and that the array length is
  //    consistent with non-negative pagination metadata.
  TestValidator.predicate(
    "data array length is consistent with non-negative records",
    pageResult.data.length >= 0 && pagination.records >= 0,
  );
}
