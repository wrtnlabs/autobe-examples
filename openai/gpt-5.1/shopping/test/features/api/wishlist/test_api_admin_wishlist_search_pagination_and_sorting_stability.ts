import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate that admin wishlist search supports consistent pagination and
 * created_at-desc sorting across multiple pages.
 *
 * Business flow:
 *
 * 1. Register an admin account.
 * 2. Register a customer account.
 * 3. Login as the customer.
 * 4. Create more than one page worth of wishlists (e.g., 25 when limit=10).
 * 5. Login as the admin.
 * 6. Query admin wishlist index for page 0, 1, 2 with orderBy=created_at,
 *    orderDirection=desc.
 * 7. Verify pagination metadata and that ID sets of pages do not overlap.
 * 8. Confirm that created_at ordering is globally non-increasing across the first
 *    three pages.
 * 9. Re-query page 0 to assert deterministic, stable result ordering.
 */
export async function test_api_admin_wishlist_search_pagination_and_sorting_stability(
  connection: api.IConnection,
) {
  // 1. Register an admin account
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoinOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinOutput);

  // 2. Register a customer account
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerJoinOutput: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerJoinOutput);

  // 3. Login as the customer (ensure customer auth context)
  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLoginOutput: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginOutput);

  // 4. Create more than one page worth of wishlists for this customer
  const totalWishlists = 25;
  const createdWishlists: IShoppingMallWishlist[] = [];

  for (let i = 0; i < totalWishlists; i++) {
    const createBody = {
      name: `wishlist-${i}-${RandomGenerator.alphabets(8)}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      is_default: i === 0,
      status: "active",
    } satisfies IShoppingMallWishlist.ICreate;

    const created: IShoppingMallWishlist =
      await api.functional.shoppingMall.customer.wishlists.create(connection, {
        body: createBody,
      });
    typia.assert(created);
    createdWishlists.push(created);
  }

  TestValidator.equals(
    "created wishlist count matches",
    createdWishlists.length,
    totalWishlists,
  );

  // 5. Login as the admin to switch auth context
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);

  // Helper to call admin wishlist index with consistent filters
  const limit = 10;
  const baseRequest = (page: number): IShoppingMallWishlist.IRequest => ({
    page,
    limit,
    search: undefined,
    status: "active",
    createdFrom: undefined,
    createdTo: undefined,
    orderBy: "created_at",
    orderDirection: "desc",
  });

  // 6. Query page 0
  const page0: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.admin.wishlists.index(connection, {
      body: baseRequest(0),
    });
  typia.assert(page0);

  const pagination0: IPage.IPagination = page0.pagination;
  typia.assert(pagination0);

  TestValidator.equals("page0 current index", pagination0.current, 0);
  TestValidator.equals("page0 limit", pagination0.limit, limit);
  TestValidator.predicate(
    "records should be at least number of created wishlists",
    pagination0.records >= totalWishlists,
  );
  TestValidator.predicate(
    "pages should be at least 3 for 25 records with limit 10",
    pagination0.pages >= 3,
  );

  const idsPage0 = page0.data.map((w) => w.id);

  // 7. Query page 1
  const page1: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.admin.wishlists.index(connection, {
      body: baseRequest(1),
    });
  typia.assert(page1);

  const idsPage1 = page1.data.map((w) => w.id);

  // Ensure no overlap between page0 and page1 IDs
  const overlap01 = idsPage0.filter((id) => idsPage1.includes(id));
  TestValidator.equals(
    "no overlapping wishlist IDs between page0 and page1",
    overlap01.length,
    0,
  );

  // 8. Query page 2
  const page2: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.admin.wishlists.index(connection, {
      body: baseRequest(2),
    });
  typia.assert(page2);

  const idsPage2 = page2.data.map((w) => w.id);

  const overlap02 = idsPage0.filter((id) => idsPage2.includes(id));
  const overlap12 = idsPage1.filter((id) => idsPage2.includes(id));

  TestValidator.equals(
    "no overlapping wishlist IDs between page0 and page2",
    overlap02.length,
    0,
  );
  TestValidator.equals(
    "no overlapping wishlist IDs between page1 and page2",
    overlap12.length,
    0,
  );

  // 9. Combine first three pages and check global order + uniqueness
  const combinedData = [...page0.data, ...page1.data, ...page2.data];
  const combinedIds = combinedData.map((w) => w.id);

  TestValidator.predicate(
    "combined length of first 3 pages should not exceed 30",
    combinedIds.length <= 30,
  );

  const uniqueCombinedIds = Array.from(new Set(combinedIds));
  TestValidator.equals(
    "combined IDs of first 3 pages should be unique",
    uniqueCombinedIds.length,
    combinedIds.length,
  );

  // Validate non-increasing created_at order globally across combined pages
  const createdAts = combinedData.map((w) => w.created_at);
  let isNonIncreasing = true;
  for (let i = 1; i < createdAts.length; i++) {
    if (createdAts[i] > createdAts[i - 1]) {
      isNonIncreasing = false;
      break;
    }
  }

  TestValidator.predicate(
    "created_at should be globally non-increasing across first 3 pages",
    isNonIncreasing,
  );

  // 10. Re-query page 0 to verify deterministic ordering
  const page0Again: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.admin.wishlists.index(connection, {
      body: baseRequest(0),
    });
  typia.assert(page0Again);

  const idsPage0Again = page0Again.data.map((w) => w.id);

  TestValidator.equals(
    "page0 IDs should be stable between repeated calls",
    idsPage0Again,
    idsPage0,
  );
}
