import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Test that an administrator can retrieve a paginated and filtered list of
 * customer wishlists using PATCH /shoppingMall/admin/wishlists.
 *
 * Steps:
 *
 * 1. Register and authenticate as admin
 * 2. Perform multiple paginated/filtered wishlist queries:
 *
 *    - Basic pagination (page/limit)
 *    - Filtering for a specific customer_id
 *    - Filtering by created_from/created_to date window
 *    - Sorting results
 *    - Edge: request an out-of-bounds (empty) page
 * 3. Validate results for correct paging, expected filtering, privacy policy
 *    (summary data only), and proper sort ordering
 */
export async function test_api_admin_wishlist_index_search_with_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminName: string = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Retrieve wishlists with various filters/pagination
  // 2.1 Basic: get first page with default limit
  const baseRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallWishlist.IRequest;
  const page1 = await api.functional.shoppingMall.admin.wishlists.index(
    connection,
    {
      body: baseRequest,
    },
  );
  typia.assert(page1);
  TestValidator.predicate(
    "pagination current page is 1",
    page1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    page1.pagination.limit === 10,
  );

  // If any wishlists exist, try filtering by customer_id
  if (page1.data.length > 0) {
    const wishlist = page1.data[0];
    // 2.2 Filtering by customer_id
    const byCustomerRequest = {
      ...baseRequest,
      customer_id: wishlist.customer.id,
    } satisfies IShoppingMallWishlist.IRequest;
    const byCustomer = await api.functional.shoppingMall.admin.wishlists.index(
      connection,
      {
        body: byCustomerRequest,
      },
    );
    typia.assert(byCustomer);
    // All returned wishlists belong to the requested customer
    for (const row of byCustomer.data) {
      TestValidator.equals(
        "wishlist belongs to requested customer",
        row.customer.id,
        wishlist.customer.id,
      );
    }
  }

  // 2.3 Filtering by created_from/created_to (if any exist)
  if (page1.data.length > 0) {
    const wishlistSample = page1.data[0];
    const createdAt = wishlistSample.created_at;
    // Pick a window covering this wishlist only
    const filterByDateRequest = {
      ...baseRequest,
      created_from: createdAt,
      created_to: createdAt,
    } satisfies IShoppingMallWishlist.IRequest;
    const filteredByDate =
      await api.functional.shoppingMall.admin.wishlists.index(connection, {
        body: filterByDateRequest,
      });
    typia.assert(filteredByDate);
    // All returned wishlists created_at should exactly match the filter
    for (const row of filteredByDate.data) {
      TestValidator.equals(
        "wishlist filtered by created_at date",
        row.created_at,
        createdAt,
      );
    }
  }

  // 2.4 Sorting by created_at desc/asc (only if some wishlists exist)
  if (page1.data.length > 1) {
    // Descending
    const descSortRequest = {
      ...baseRequest,
      sort_by: "created_at",
      sort_order: "desc",
    } satisfies IShoppingMallWishlist.IRequest;
    const descSorted = await api.functional.shoppingMall.admin.wishlists.index(
      connection,
      {
        body: descSortRequest,
      },
    );
    typia.assert(descSorted);
    // Ascending
    const ascSortRequest = {
      ...baseRequest,
      sort_by: "created_at",
      sort_order: "asc",
    } satisfies IShoppingMallWishlist.IRequest;
    const ascSorted = await api.functional.shoppingMall.admin.wishlists.index(
      connection,
      {
        body: ascSortRequest,
      },
    );
    typia.assert(ascSorted);
    // Sorted order check (descending)
    for (let i = 1; i < descSorted.data.length; ++i) {
      TestValidator.predicate(
        `desc created_at order at index ${i}`,
        descSorted.data[i - 1].created_at >= descSorted.data[i].created_at,
      );
    }
    // Sorted order check (ascending)
    for (let i = 1; i < ascSorted.data.length; ++i) {
      TestValidator.predicate(
        `asc created_at order at index ${i}`,
        ascSorted.data[i - 1].created_at <= ascSorted.data[i].created_at,
      );
    }
  }

  // 2.5 Edge: Request an out-of-bounds page (expect zero results)
  const emptyPageRequest = {
    page: 99999 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallWishlist.IRequest;
  const emptyPage = await api.functional.shoppingMall.admin.wishlists.index(
    connection,
    {
      body: emptyPageRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals("empty page has no data", emptyPage.data.length, 0);

  // 3. Validate that only summary (non-sensitive) info returned
  //   – Each wishlist row must only have: id, customer summary, created_at
  for (const entry of page1.data) {
    TestValidator.predicate(
      "wishlist row only includes summary fields",
      "id" in entry &&
        "customer" in entry &&
        "created_at" in entry &&
        Object.keys(entry).length === 3,
    );
    // Validate customer summary non-sensitive fields
    TestValidator.predicate(
      "customer summary only includes id and name",
      "id" in entry.customer &&
        "name" in entry.customer &&
        Object.keys(entry.customer).length === 2,
    );
  }
}
