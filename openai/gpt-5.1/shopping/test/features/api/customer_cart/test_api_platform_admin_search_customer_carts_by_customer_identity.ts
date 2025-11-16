import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerCart";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Platform admin cart search by customer identity.
 *
 * This E2E test validates that a platform administrator can search customer
 * carts from the `shopping_mall_customer_carts` index endpoint using customer
 * identity-related filters exposed by `IShoppingMallCustomerCart.IRequest`.
 *
 * Business goals:
 *
 * - Ensure that once a platform admin is authenticated via POST
 *   /auth/platformAdmin/join, they can call PATCH
 *   /shoppingMall/platformAdmin/customerCarts.
 * - Verify that filtering by `customer_id` returns only carts belonging to that
 *   customer.
 * - Exercise the `customer_email` filter path with structurally valid data even
 *   though email is not exposed on the cart summary DTO.
 * - Confirm that searching with a clearly non-existent `customer_id` produces an
 *   empty page (records = 0, pages = 0, data.length = 0).
 *
 * Implementation outline:
 *
 * 1. Join a platform admin using `api.functional.auth.platformAdmin.join` with a
 *    random but valid `IShoppingMallPlatformAdminJoin.IRequest`. The SDK will
 *    inject the access token into connection.headers.
 * 2. Perform an initial unfiltered cart search (only page/limit) using
 *    `api.functional.shoppingMall.platformAdmin.customerCarts.index` to obtain
 *    at least one existing `IShoppingMallCustomerCart.ISummary`. If no carts
 *    exist (records === 0), the test cannot validate identity-specific
 *    filtering; in that case, assert structural correctness and short-circuit.
 * 3. When at least one cart exists: 3-1. Extract its `customer_id`. 3-2. Call the
 *    same index endpoint again with a request body that sets `customer_id` and
 *    a limit. Assert the response type with `typia.assert` and use
 *    `TestValidator` to confirm: - `data.length` is <= requested limit. - Every
 *    cart summary’s `customer_id` equals the requested `customer_id`.
 * 4. Exercise the `customer_email` filter path:
 *
 *    - Generate a syntactically valid email via `typia.random<string &
 *         tags.Format<"email">>()`.
 *    - Call index with `customer_email` and a small `limit`.
 *    - Assert only structural correctness and sanity of pagination (e.g., records >=
 *         0, pages >= 0, data.length <= limit), because we cannot cross-check
 *         email against DTO fields.
 * 5. Test non-existent `customer_id` behavior:
 *
 *    - Generate a random UUID as a fake `customer_id` using `typia.random<string &
 *         tags.Format<"uuid">>()`.
 *    - Call index with that id and a small `limit`.
 *    - Assert that the response page has `records === 0`, `pages === 0`, and
 *         `data.length === 0`.
 */
export async function test_api_platform_admin_search_customer_carts_by_customer_identity(
  connection: api.IConnection,
) {
  // 1. Join a platform administrator session so that platformAdmin endpoints are authorized.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Initial unfiltered search to inspect existing carts.
  const initialRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCustomerCart.IRequest;

  const initialPage: IPageIShoppingMallCustomerCart.ISummary =
    await api.functional.shoppingMall.platformAdmin.customerCarts.index(
      connection,
      { body: initialRequest },
    );
  typia.assert<IPageIShoppingMallCustomerCart.ISummary>(initialPage);

  // Basic sanity checks for initial pagination.
  TestValidator.predicate(
    "initial records non-negative",
    () => initialPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "initial pages non-negative",
    () => initialPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "initial data length within limit",
    () => initialPage.data.length <= initialRequest.limit,
  );

  // If there are no carts at all, we cannot perform identity-based assertions.
  if (initialPage.pagination.records === 0 || initialPage.data.length === 0) {
    // The index still behaved correctly structurally; nothing more to assert.
    return;
  }

  // 3. Filter by customer_id using one of the existing carts as the source of truth.
  const sampleCart: IShoppingMallCustomerCart.ISummary = initialPage.data[0];
  typia.assert<IShoppingMallCustomerCart.ISummary>(sampleCart);

  const customerIdFilter = sampleCart.customer_id;

  const byCustomerIdRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    customer_id: customerIdFilter,
  } satisfies IShoppingMallCustomerCart.IRequest;

  const byCustomerIdPage: IPageIShoppingMallCustomerCart.ISummary =
    await api.functional.shoppingMall.platformAdmin.customerCarts.index(
      connection,
      { body: byCustomerIdRequest },
    );
  typia.assert<IPageIShoppingMallCustomerCart.ISummary>(byCustomerIdPage);

  // Ensure all returned carts belong to the requested customer_id.
  TestValidator.predicate(
    "customer_id filter returns only carts for that customer",
    () =>
      byCustomerIdPage.data.every(
        (cart) => cart.customer_id === customerIdFilter,
      ),
  );
  TestValidator.predicate(
    "customer_id page data within limit",
    () => byCustomerIdPage.data.length <= byCustomerIdRequest.limit,
  );

  // 4. Exercise customer_email filter path with a syntactically valid email.
  const emailFilter = typia.random<string & tags.Format<"email">>();

  const byEmailRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    customer_email: emailFilter,
  } satisfies IShoppingMallCustomerCart.IRequest;

  const byEmailPage: IPageIShoppingMallCustomerCart.ISummary =
    await api.functional.shoppingMall.platformAdmin.customerCarts.index(
      connection,
      { body: byEmailRequest },
    );
  typia.assert<IPageIShoppingMallCustomerCart.ISummary>(byEmailPage);

  TestValidator.predicate(
    "email-filtered records non-negative",
    () => byEmailPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "email-filtered pages non-negative",
    () => byEmailPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "email-filtered data length within limit",
    () => byEmailPage.data.length <= byEmailRequest.limit,
  );

  // 5. Search with a clearly non-existent customer_id and expect an empty page.
  const nonexistentCustomerId = typia.random<string & tags.Format<"uuid">>();

  const nonexistentIdRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    customer_id: nonexistentCustomerId,
  } satisfies IShoppingMallCustomerCart.IRequest;

  const nonexistentIdPage: IPageIShoppingMallCustomerCart.ISummary =
    await api.functional.shoppingMall.platformAdmin.customerCarts.index(
      connection,
      { body: nonexistentIdRequest },
    );
  typia.assert<IPageIShoppingMallCustomerCart.ISummary>(nonexistentIdPage);

  TestValidator.equals(
    "non-existent customer_id yields zero records",
    nonexistentIdPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent customer_id yields zero pages",
    nonexistentIdPage.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent customer_id yields empty data array",
    nonexistentIdPage.data.length,
    0,
  );
}
