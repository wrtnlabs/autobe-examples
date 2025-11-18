import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderSearch";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallOrderSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSearch";

/**
 * Validate that admin order search cannot be performed without admin auth.
 *
 * Business context: Admin order search exposes sensitive order and customer
 * information and must be protected so that only authenticated admin actors can
 * use it. We therefore need to ensure that calling the endpoint without a valid
 * admin token results in an authorization failure, while the same request
 * succeeds when an admin is properly authenticated.
 *
 * Test steps:
 *
 * 1. Prepare a syntactically valid search payload using
 *    IShoppingMallOrderSearch.IRequest with simple pagination (page/limit) and
 *    null date filters so that request validation passes when authorized.
 * 2. Derive an unauthenticated connection from the provided connection object by
 *    shallow-cloning it and setting an empty headers object once: const
 *    unauthConn: api.IConnection = { ...connection, headers: {} }; Do not read,
 *    mutate, or conditionally touch connection.headers after this.
 * 3. Using the unauthConn, call
 *    api.functional.shoppingMall.admin.search.orders.index(unauthConn, { body
 *    }) inside an async callback to TestValidator.error, and `await` the
 *    TestValidator.error call, to assert that an error is thrown due to missing
 *    authorization. Do not inspect status code or error payload; only the fact
 *    that it fails.
 * 4. As a positive control, first or afterwards perform POST /auth/admin/join via
 *    api.functional.auth.admin.join(connection, { body: ... }) using a random
 *    IShoppingMallAdminJoin.ICreate payload, and assert the
 *    IShoppingMallAdmin.IAuthorized result with typia.assert. This also lets
 *    the SDK attach the admin access token to `connection` automatically.
 * 5. With the authenticated `connection`, call the same search endpoint
 *    api.functional.shoppingMall.admin.search.orders.index(connection, { body
 *    }) using the same request body, assert the
 *    IPageIShoppingMallOrderSearch.ISummary response with typia.assert, and
 *    optionally validate basic business-level expectations like non-negative
 *    pagination counts.
 *
 * Assertions:
 *
 * - Unauthenticated call via unauthConn must result in an error, validated via
 *   `await TestValidator.error("unauthenticated admin search must fail", async
 *   () => { ... })`.
 * - Authenticated call via connection must succeed and return a response that
 *   conforms to IPageIShoppingMallOrderSearch.ISummary (typia.assert).
 */
export async function test_api_admin_order_search_unauthorized_without_token(
  connection: api.IConnection,
) {
  // 1. Prepare a valid search request body
  const requestBody = {
    // conservative filters: no IDs, open date ranges
    order_codes: undefined,
    customer_ids: undefined,
    guestuser_ids: undefined,
    seller_ids: undefined,
    current_statuses: undefined,
    payment_statuses: undefined,
    shipment_statuses: undefined,
    created_from: null,
    created_to: null,
    placed_from: null,
    placed_to: null,
    updated_from: null,
    updated_to: null,
    min_grand_total_amount: null,
    max_grand_total_amount: null,
    item_sku_ids: undefined,
    free_text: undefined,
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort_key: "created_at",
    sort_direction: "desc",
  } satisfies IShoppingMallOrderSearch.IRequest;

  // 2. Positive control: join as admin to ensure payload is valid when authorized
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 3. Authenticated search must succeed with the same request body
  const successPage: IPageIShoppingMallOrderSearch.ISummary =
    await api.functional.shoppingMall.admin.search.orders.index(connection, {
      body: requestBody,
    });
  typia.assert<IPageIShoppingMallOrderSearch.ISummary>(successPage);
  // Basic sanity checks on pagination
  TestValidator.predicate(
    "authenticated search returns non-negative pagination counts",
    successPage.pagination.current >= 0 &&
      successPage.pagination.limit >= 0 &&
      successPage.pagination.records >= 0 &&
      successPage.pagination.pages >= 0,
  );

  // 4. Build an unauthenticated connection without touching connection.headers
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Unauthenticated search must fail
  await TestValidator.error(
    "unauthenticated admin order search must fail",
    async () => {
      await api.functional.shoppingMall.admin.search.orders.index(unauthConn, {
        body: requestBody,
      });
    },
  );
}
