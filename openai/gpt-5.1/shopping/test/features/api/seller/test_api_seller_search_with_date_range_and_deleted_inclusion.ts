import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller search date range filters and include_deleted flag semantics.
 *
 * Business intent:
 *
 * - Ensure that PATCH /shoppingMall/sellers accepts well-formed
 *   IShoppingMallSeller.IRequest payloads with created/updated range filters.
 * - Verify that toggling include_deleted between false and true does not break
 *   pagination contract and that the include_deleted=true result set is
 *   consistent with (and typically a superset of) the include_deleted=false
 *   result under the same filters.
 *
 * Constraints of this test environment:
 *
 * - We do NOT have APIs to create, update, or logically delete sellers.
 * - Therefore we cannot synthesize specific sellers with controlled
 *   created_at/updated_at/deleted_at timestamps.
 * - We must treat database contents as opaque and focus on relational properties
 *   between two search invocations that differ only by include_deleted.
 *
 * High-level steps:
 *
 * 1. Bootstrap a platform administrator session via POST /auth/platformAdmin/join
 *    (api.functional.auth.platformAdmin.join). The SDK automatically sets
 *    Authorization headers on the connection.
 * 2. Create a catalog brand via POST /shoppingMall/platformAdmin/brands
 *    (api.functional.shoppingMall.platformAdmin.brands.create). This is a
 *    prerequisite step that mimics brand ecosystem initialization mentioned in
 *    the scenario, although the seller search endpoint itself does not depend
 *    on a specific brand instance in its request DTO.
 * 3. Prepare a narrow date-time window around `now` to exercise created_from /
 *    created_to and updated_from / updated_to filters. We do not assert that
 *    all returned sellers fall within these ranges because we cannot observe
 *    seller timestamps from the available ISummary DTO. Instead, we assert that
 *    the backend accepts and responds to such filtered queries without type
 *    violations.
 * 4. Call PATCH /shoppingMall/sellers twice with identical filters except for
 *    include_deleted:
 *
 *    - First with include_deleted: false
 *    - Second with include_deleted: true
 * 5. Validate the following invariants:
 *
 *    - Both responses conform to IPageIShoppingMallSeller.ISummary via typia.assert.
 *    - Pagination metadata (limit, current, pages, records) are non-negative and
 *         internally coherent (e.g., pages==0 implies records==0, otherwise
 *         pages>=1).
 *    - Every element in data is a valid IShoppingMallSeller.ISummary.
 *    - Every seller id returned in the include_deleted=false call must appear in the
 *         include_deleted=true call when the filters are identical. This
 *         encodes the requirement that enabling include_deleted cannot _remove_
 *         matching non-deleted sellers.
 *
 * Note: Because we cannot observe deleted_at or timestamps from
 * IShoppingMallSeller.ISummary, we cannot directly assert that logically
 * deleted sellers appear only when include_deleted is true. Instead, this test
 * validates the weaker but still meaningful monotonicity and type-safety
 * properties that follow from the include_deleted semantics and pagination
 * contract.
 */
export async function test_api_seller_search_with_date_range_and_deleted_inclusion(
  connection: api.IConnection,
) {
  // 1. Bootstrap a platform administrator session.
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a brand as prerequisite catalog initialization.
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri:
      "https://cdn.shoppingmall.test/logo/" + RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Prepare date range filters around now.
  const now = new Date();
  const oneHourMs = 60 * 60 * 1000;
  const createdFrom = new Date(now.getTime() - oneHourMs).toISOString();
  const createdTo = new Date(now.getTime() + oneHourMs).toISOString();
  const updatedFrom = createdFrom;
  const updatedTo = createdTo;

  // Common search request base with tight date window and deterministic
  // pagination settings.
  const baseRequest = {
    page: 1,
    limit: 20,
    sort_field: "created_at",
    sort_order: "desc",
    created_from: createdFrom,
    created_to: createdTo,
    updated_from: updatedFrom,
    updated_to: updatedTo,
  } satisfies IShoppingMallSeller.IRequest;

  // 4. First search: include_deleted = false (default exclusion of logically
  // deleted sellers).
  const requestWithoutDeleted = {
    ...baseRequest,
    include_deleted: false,
  } satisfies IShoppingMallSeller.IRequest;

  const pageWithoutDeleted: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.sellers.index(connection, {
      body: requestWithoutDeleted,
    });
  typia.assert(pageWithoutDeleted);

  // Basic pagination sanity checks for the first response.
  const paginationWithout = pageWithoutDeleted.pagination;
  TestValidator.predicate(
    "pagination.current must be >= 0",
    paginationWithout.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit must be >= 0",
    paginationWithout.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records must be >= 0",
    paginationWithout.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages must be >= 0",
    paginationWithout.pages >= 0,
  );

  // When there are no records, pages should be 0 and data should be empty.
  if (paginationWithout.records === 0) {
    TestValidator.equals(
      "no records implies zero pages",
      paginationWithout.pages,
      0,
    );
    TestValidator.equals(
      "no records implies empty data array (without deleted)",
      pageWithoutDeleted.data.length,
      0,
    );
  }

  // 5. Second search: same filters, include_deleted = true.
  const requestWithDeleted = {
    ...baseRequest,
    include_deleted: true,
  } satisfies IShoppingMallSeller.IRequest;

  const pageWithDeleted: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.sellers.index(connection, {
      body: requestWithDeleted,
    });
  typia.assert(pageWithDeleted);

  const paginationWith = pageWithDeleted.pagination;

  // Pagination sanity checks for the second response.
  TestValidator.predicate(
    "pagination.current (with deleted) must be >= 0",
    paginationWith.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit (with deleted) must be >= 0",
    paginationWith.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records (with deleted) must be >= 0",
    paginationWith.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages (with deleted) must be >= 0",
    paginationWith.pages >= 0,
  );

  if (paginationWith.records === 0) {
    TestValidator.equals(
      "no records implies zero pages (with deleted)",
      paginationWith.pages,
      0,
    );
    TestValidator.equals(
      "no records implies empty data array (with deleted)",
      pageWithDeleted.data.length,
      0,
    );
  }

  // 6. Monotonicity: include_deleted=true result must contain every seller id
  // returned when include_deleted=false, under identical filters.
  const idsWithoutDeleted = new Set(
    pageWithoutDeleted.data.map((seller) => seller.id),
  );
  const idsWithDeleted = new Set(
    pageWithDeleted.data.map((seller) => seller.id),
  );

  for (const id of idsWithoutDeleted) {
    TestValidator.predicate(
      "seller id from include_deleted=false must also appear when include_deleted=true",
      idsWithDeleted.has(id),
    );
  }

  // 7. Type-level assurance that every item in data arrays is a valid
  // IShoppingMallSeller.ISummary (already guaranteed by typia.assert on the
  // page objects, but we can still loop to emphasize usage).
  for (const seller of pageWithoutDeleted.data) {
    typia.assert<IShoppingMallSeller.ISummary>(seller);
  }
  for (const seller of pageWithDeleted.data) {
    typia.assert<IShoppingMallSeller.ISummary>(seller);
  }
}
