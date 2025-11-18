import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate filtered and sorted administrator listing for shopping mall admins.
 *
 * ## Business goal
 *
 * Ensure that the privileged admin listing endpoint `PATCH
 * /shoppingMall/admin/admins` correctly interprets
 * `IShoppingMallAdmin.IRequest` filters and sorting options, and returns a
 * well-formed paginated page of `IShoppingMallAdmin.ISummary` items.
 *
 * This test focuses on what is actually possible with the currently exposed API
 * surface:
 *
 * - Administrator creation via `POST /auth/admin/join` using
 *   `IShoppingMallAdminJoin.ICreate`.
 * - Listing via `PATCH /shoppingMall/admin/admins` using
 *   `IShoppingMallAdmin.IRequest` and receiving
 *   `IPageIShoppingMallAdmin.ISummary`.
 *
 * Status and role-related filters are _not_ exercised because the current
 * snippet does not provide any admin-update or role-assignment APIs. Instead,
 * the test validates realistic, implementable behaviour:
 *
 * - Free-text `search` against the admin email field.
 * - `created_from` / `created_to` range filtering around known records.
 * - Sorting by safe, obviously-supported fields such as `created_at` and `email`
 *   in both ascending and descending directions.
 * - Basic pagination metadata integrity.
 * - Invalid `order_by` value causing an error (without depending on any
 *   particular HTTP status code).
 *
 * ## High-level flow
 *
 * 1. Register two distinct administrators (Admin A, Admin B) using
 *    `api.functional.auth.admin.join`, each with a clearly distinguishable
 *    email so that `search` queries can isolate them.
 * 2. Immediately after the joins, call
 *    `api.functional.shoppingMall.admin.admins.index` with an
 *    `IShoppingMallAdmin.IRequest` body that:
 *
 *    - Uses `search` with a substring unique to Admin B’s email so that Admin B is
 *         guaranteed to match and Admin A is unlikely to match.
 *    - Sets `page` and `limit` to small positive values.
 *    - Sets `order_by` to `created_at` and `order_direction` to `asc`.
 * 3. Verify that:
 *
 *    - Response type is valid via `typia.assert`.
 *    - Pagination metadata is consistent: `current`, `limit`, `pages`, and `records`
 *         are non-negative and logically related.
 *    - Every entry in `data` has `email` containing the chosen search substring.
 * 4. Repeat the listing with `order_direction` = `desc` and the same `search`,
 *    ensuring that when the same IDs appear, their order is the reverse of the
 *    `asc` call (simple sort-direction sanity check restricted to the subset
 *    returned).
 * 5. Exercise `created_from` / `created_to` by:
 *
 *    - Capturing a timestamp string derived from Admin A’s `created_at`.
 *    - Issuing a request with `created_from` set to that value so that Admin A and
 *         later admins are all within the window.
 *    - Asserting that any returned records have `created_at` greater than or equal
 *         to the bound.
 * 6. Call the index endpoint with an intentionally invalid `order_by` value (e.g.,
 *    a field name that is extremely unlikely to be whitelisted such as
 *    `"__invalid_field__"`) and wrap the call in `TestValidator.error` to
 *    confirm that the backend rejects it in some way. The test must not assert
 *    any specific HTTP status code or error message, only that an error
 *    occurs.
 *
 * ## Notes and constraints
 *
 * - Authentication tokens are managed automatically by the SDK; the test must
 *   _never_ manipulate `connection.headers` directly.
 * - Request bodies must use `satisfies` with the concrete DTO types
 *   (`IShoppingMallAdminJoin.ICreate` and `IShoppingMallAdmin.IRequest`), and
 *   never use `as any` or other unsafe casts.
 * - All API calls must be awaited.
 * - No additional imports may be added; use only what the template provides.
 */
export async function test_api_admin_list_with_filters_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register Admin A with a random email
  const adminAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminA: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminAEmail,
        password: typia.random<string & tags.Format<"password">>(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdminJoin.ICreate,
    });
  typia.assert(adminA);

  // 2. Register Admin B and choose a search substring from its email
  const adminB: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdminJoin.ICreate,
    });
  typia.assert(adminB);

  // Derive a search stem that is guaranteed to be contained in adminB.email
  const atIndexB: number = adminB.email.indexOf("@");
  const localPartB: string =
    atIndexB > 0 ? adminB.email.slice(0, atIndexB) : adminB.email;
  const emailStem: string =
    localPartB.length >= 4 ? localPartB.slice(0, 4) : localPartB;

  // 3. Basic search filter test (order_by = created_at asc)
  const pageAsc: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {
        page: 1,
        limit: 20,
        search: emailStem,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(pageAsc);

  // Validate pagination
  const paginationAsc = pageAsc.pagination;
  TestValidator.predicate(
    "pagination current page is >= 0",
    paginationAsc.current >= 0,
  );
  TestValidator.predicate("pagination limit is >= 0", paginationAsc.limit >= 0);
  TestValidator.predicate(
    "pagination records is >= 0",
    paginationAsc.records >= 0,
  );
  TestValidator.predicate("pagination pages is >= 0", paginationAsc.pages >= 0);

  // Assert all results match search filter (email contains stem)
  for (const summary of pageAsc.data) {
    TestValidator.predicate(
      "each admin email includes search substring",
      summary.email.includes(emailStem),
    );
  }

  // 4. Same search with order_direction = desc, check ordering difference
  const pageDesc: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {
        page: 1,
        limit: 20,
        search: emailStem,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(pageDesc);

  // Check that the sets of IDs for asc/desc are identical (same result set)
  const ascIds: string[] = pageAsc.data.map((s) => s.id);
  const descIds: string[] = pageDesc.data.map((s) => s.id);
  TestValidator.equals(
    "asc and desc result sets have same length",
    ascIds.length,
    descIds.length,
  );

  // When there are at least two records, verify that reversing asc approximates desc
  if (ascIds.length >= 2) {
    const reversedAscIds = [...ascIds].reverse();
    TestValidator.equals(
      "desc order equals reversed asc order for matching set",
      descIds,
      reversedAscIds,
    );
  }

  // 5. created_from filter: use Admin A's created_at as lower bound
  const createdFrom: string & tags.Format<"date-time"> = adminA.created_at;

  const pageFromA: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {
        page: 1,
        limit: 50,
        created_from: createdFrom,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(pageFromA);

  // Validate that all results have created_at >= createdFrom lexicographically
  for (const summary of pageFromA.data) {
    TestValidator.predicate(
      "created_at of summary is >= created_from bound",
      summary.created_at >= createdFrom,
    );
  }

  // 6. Invalid order_by should cause an error (do not assert specific status code)
  await TestValidator.error("invalid order_by must cause error", async () => {
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {
        page: 1,
        limit: 10,
        order_by: "__invalid_field__",
        order_direction: "asc",
      } satisfies IShoppingMallAdmin.IRequest,
    });
  });
}
