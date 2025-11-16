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
 * Validate platform admin search of customer carts with date range filters and
 * sorting.
 *
 * ## Business goal
 *
 * Ensure that a platform administrator can query customer carts using creation
 * and last-update date windows, and request results ordered by `updated_at`
 * both descending and ascending. This supports operational workflows where
 * support staff or analysts need to inspect the most/least recently updated
 * carts.
 *
 * ## Scenario
 *
 * 1. Register (join) a platform admin with POST /auth/platformAdmin/join. This
 *    yields an IShoppingMallPlatformAdmin.IAuthorized and, through the SDK, an
 *    Authorization header for subsequent calls.
 * 2. Assume customer cart data already exist in the system. This test does not
 *    create or alter carts; it only exercises the search endpoint.
 * 3. Build a first search body using IShoppingMallCustomerCart.IRequest with:
 *
 *    - Page: 1
 *    - Limit: a small page size (e.g., 20)
 *    - Created_from / created_to: an ISO 8601 window
 *    - Updated_from / updated_to: another ISO 8601 window
 *    - Sort_by: "updated_at"
 *    - Sort_direction: "desc" Other filter properties (customer_id, states,
 *         is_active, include_deleted, etc.) are left undefined so they don’t
 *         restrict results.
 * 4. Call PATCH /shoppingMall/platformAdmin/customerCarts through
 *    api.functional.shoppingMall.platformAdmin.customerCarts.index with this
 *    body and get IPageIShoppingMallCustomerCart.ISummary.
 * 5. Validate via typia.assert that the response conforms to the expected
 *    page+data structure.
 * 6. For every cart in the returned data array, verify:
 *
 *    - Created_at is within [created_from, created_to].
 *    - Updated_at is within [updated_from, updated_to]. Because timestamps are ISO
 *         8601 strings, comparisons can be done by converting them to Date
 *         objects.
 * 7. Validate that the list is ordered by updated_at descending, i.e. for each
 *    consecutive pair (prev, next), next.updated_at <= prev.updated_at.
 * 8. Build a second search body identical to the first except with sort_direction:
 *    "asc".
 * 9. Call the index endpoint again and:
 *
 *    - Validate response structure with typia.assert.
 *    - Re-check that updated_at is within [updated_from, updated_to].
 *    - Validate ascending ordering: for each consecutive pair, next.updated_at >=
 *         prev.updated_at.
 * 10. Handle empty or single-element result sets gracefully: ordering checks should
 *     trivially pass when there are fewer than two elements.
 *
 * ## Notes and constraints
 *
 * - This test never manipulates connection.headers directly; SDK functions take
 *   care of Authorization.
 * - It does not test HTTP status codes explicitly; successful awaited calls are
 *   considered OK.
 * - No carts are created or mutated here—data are assumed to be present from
 *   fixtures or prior steps in the overall test suite.
 */
export async function test_api_platform_admin_search_customer_carts_with_date_and_sorting(
  connection: api.IConnection,
) {
  // 1. Join a platform admin to obtain an authenticated admin session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Define date ranges for created_at and updated_at filters.
  //    We derive them from a base time to ensure consistent ordering.
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const createdFrom = new Date(now.getTime() - 7 * oneDayMs).toISOString();
  const createdTo = now.toISOString();

  const updatedFrom = new Date(now.getTime() - 3 * oneDayMs).toISOString();
  const updatedTo = now.toISOString();

  // 3. First search: sort by updated_at descending
  const requestDesc = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    created_from: createdFrom,
    created_to: createdTo,
    updated_from: updatedFrom,
    updated_to: updatedTo,
    sort_by: "updated_at",
    sort_direction: "desc" as const,
  } satisfies IShoppingMallCustomerCart.IRequest;

  const pageDesc: IPageIShoppingMallCustomerCart.ISummary =
    await api.functional.shoppingMall.platformAdmin.customerCarts.index(
      connection,
      { body: requestDesc },
    );
  typia.assert(pageDesc);

  const cartsDesc = pageDesc.data;

  // Validate date-range constraints and descending ordering
  const createdFromTime = new Date(createdFrom).getTime();
  const createdToTime = new Date(createdTo).getTime();
  const updatedFromTime = new Date(updatedFrom).getTime();
  const updatedToTime = new Date(updatedTo).getTime();

  for (let i = 0; i < cartsDesc.length; i++) {
    const cart = cartsDesc[i];

    const createdAtTime = new Date(cart.created_at).getTime();
    const updatedAtTime = new Date(cart.updated_at).getTime();

    TestValidator.predicate(
      `desc: cart ${cart.id} created_at within range`,
      createdAtTime >= createdFromTime && createdAtTime <= createdToTime,
    );
    TestValidator.predicate(
      `desc: cart ${cart.id} updated_at within range`,
      updatedAtTime >= updatedFromTime && updatedAtTime <= updatedToTime,
    );

    if (i > 0) {
      const prev = cartsDesc[i - 1];
      const prevUpdatedAtTime = new Date(prev.updated_at).getTime();
      TestValidator.predicate(
        `desc: updated_at ordering between index ${i - 1} and ${i}`,
        updatedAtTime <= prevUpdatedAtTime,
      );
    }
  }

  // 4. Second search: sort by updated_at ascending with identical filters
  const requestAsc = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    created_from: createdFrom,
    created_to: createdTo,
    updated_from: updatedFrom,
    updated_to: updatedTo,
    sort_by: "updated_at",
    sort_direction: "asc" as const,
  } satisfies IShoppingMallCustomerCart.IRequest;

  const pageAsc: IPageIShoppingMallCustomerCart.ISummary =
    await api.functional.shoppingMall.platformAdmin.customerCarts.index(
      connection,
      { body: requestAsc },
    );
  typia.assert(pageAsc);

  const cartsAsc = pageAsc.data;

  for (let i = 0; i < cartsAsc.length; i++) {
    const cart = cartsAsc[i];

    const createdAtTime = new Date(cart.created_at).getTime();
    const updatedAtTime = new Date(cart.updated_at).getTime();

    TestValidator.predicate(
      `asc: cart ${cart.id} created_at within range`,
      createdAtTime >= createdFromTime && createdAtTime <= createdToTime,
    );
    TestValidator.predicate(
      `asc: cart ${cart.id} updated_at within range`,
      updatedAtTime >= updatedFromTime && updatedAtTime <= updatedToTime,
    );

    if (i > 0) {
      const prev = cartsAsc[i - 1];
      const prevUpdatedAtTime = new Date(prev.updated_at).getTime();
      TestValidator.predicate(
        `asc: updated_at ordering between index ${i - 1} and ${i}`,
        updatedAtTime >= prevUpdatedAtTime,
      );
    }
  }
}
