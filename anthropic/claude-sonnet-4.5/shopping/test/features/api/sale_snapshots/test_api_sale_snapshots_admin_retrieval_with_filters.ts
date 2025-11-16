import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that platform administrators can successfully retrieve paginated
 * historical snapshots for a specific product sale with various filtering
 * options.
 *
 * This test validates the complete snapshot retrieval workflow including
 * authentication, sale creation, and snapshot querying with temporal filters.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin to gain platform-wide access
 * 2. Authenticate as seller to create test data
 * 3. Create a product category for sale assignment
 * 4. Create a product sale that will generate snapshots
 * 5. Retrieve snapshots with various filters including status, date ranges,
 *    pagination parameters, and sorting options
 * 6. Verify that the response includes proper pagination metadata
 * 7. Verify that snapshot summaries contain essential fields (id, sale_id, title,
 *    code, status, created_at)
 * 8. Validate that filtering correctly restricts results
 * 9. Test both ascending and descending chronological sorting
 */
export async function test_api_sale_snapshots_admin_retrieval_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: "https://admin.marketplace.test/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://admin.marketplace.test/home" satisfies string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create and authenticate as seller to create test sale
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const sellerData = {
    email: sellerEmail,
    password: sellerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.content({ paragraphs: 2 }),
    store_name: RandomGenerator.name(2),
    href: "https://seller.marketplace.test/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://seller.marketplace.test/info" satisfies string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 3: Switch back to admin and create a product category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminData.email,
      password: adminData.password,
      href: "https://admin.marketplace.test/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://admin.marketplace.test/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: RandomGenerator.pick(["active", "inactive"] as const),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 4: Switch to seller and create a product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://seller.marketplace.test/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://seller.marketplace.test/dashboard" satisfies string &
        tags.Format<"uri">,
    } satisfies IShoppingMallSeller.ILogin,
  });

  const saleData = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    brand: RandomGenerator.name(1),
    condition: RandomGenerator.pick(["new", "refurbished", "used"] as const),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
    status: RandomGenerator.pick([
      "draft",
      "pending_approval",
      "published",
      "suspended",
      "archived",
    ] as const),
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleData,
    },
  );
  typia.assert(sale);

  // Step 5: Switch back to admin to retrieve snapshots
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminData.email,
      password: adminData.password,
      href: "https://admin.marketplace.test/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://admin.marketplace.test/snapshots" satisfies string &
        tags.Format<"uri">,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 6: Test snapshot retrieval with various filters

  // Test 1: Basic retrieval with pagination
  const basicRequest = {
    limit: 20,
    page: 1,
  } satisfies IShoppingMallSaleSnapshot.IRequest;

  const basicResponse =
    await api.functional.shoppingMall.admin.sales.snapshots.index(connection, {
      saleCode: sale.code,
      body: basicRequest,
    });
  typia.assert(basicResponse);

  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    basicResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    basicResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    basicResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    basicResponse.pagination.pages >= 0,
  );

  // Test 2: Filter by sale ID
  const saleFilterRequest = {
    shopping_mall_sale_id: sale.id,
    limit: 10,
    page: 1,
  } satisfies IShoppingMallSaleSnapshot.IRequest;

  const saleFilterResponse =
    await api.functional.shoppingMall.admin.sales.snapshots.index(connection, {
      saleCode: sale.code,
      body: saleFilterRequest,
    });
  typia.assert(saleFilterResponse);

  // Validate that all snapshots belong to the correct sale
  if (saleFilterResponse.data.length > 0) {
    for (const snapshot of saleFilterResponse.data) {
      TestValidator.equals(
        "snapshot belongs to correct sale",
        snapshot.shopping_mall_sale_id,
        sale.id,
      );
    }
  }

  // Test 3: Filter by status
  const statusFilterRequest = {
    status: sale.status,
    limit: 15,
    page: 1,
  } satisfies IShoppingMallSaleSnapshot.IRequest;

  const statusFilterResponse =
    await api.functional.shoppingMall.admin.sales.snapshots.index(connection, {
      saleCode: sale.code,
      body: statusFilterRequest,
    });
  typia.assert(statusFilterResponse);

  // Test 4: Date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateFilterRequest = {
    created_at_from: thirtyDaysAgo.toISOString() satisfies string &
      tags.Format<"date-time">,
    created_at_to: now.toISOString() satisfies string &
      tags.Format<"date-time">,
    limit: 20,
    page: 1,
  } satisfies IShoppingMallSaleSnapshot.IRequest;

  const dateFilterResponse =
    await api.functional.shoppingMall.admin.sales.snapshots.index(connection, {
      saleCode: sale.code,
      body: dateFilterRequest,
    });
  typia.assert(dateFilterResponse);

  // Test 5: Descending sort (newest first)
  const descendingSortRequest = {
    sort: "-created_at" satisfies "created_at" | "-created_at",
    limit: 10,
    page: 1,
  } satisfies IShoppingMallSaleSnapshot.IRequest;

  const descendingResponse =
    await api.functional.shoppingMall.admin.sales.snapshots.index(connection, {
      saleCode: sale.code,
      body: descendingSortRequest,
    });
  typia.assert(descendingResponse);

  // Validate descending order if we have multiple snapshots
  if (descendingResponse.data.length > 1) {
    for (let i = 0; i < descendingResponse.data.length - 1; i++) {
      const current = new Date(descendingResponse.data[i].created_at).getTime();
      const next = new Date(
        descendingResponse.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        "snapshots are in descending chronological order",
        current >= next,
      );
    }
  }

  // Test 6: Ascending sort (oldest first)
  const ascendingSortRequest = {
    sort: "created_at" satisfies "created_at" | "-created_at",
    limit: 10,
    page: 1,
  } satisfies IShoppingMallSaleSnapshot.IRequest;

  const ascendingResponse =
    await api.functional.shoppingMall.admin.sales.snapshots.index(connection, {
      saleCode: sale.code,
      body: ascendingSortRequest,
    });
  typia.assert(ascendingResponse);

  // Validate ascending order if we have multiple snapshots
  if (ascendingResponse.data.length > 1) {
    for (let i = 0; i < ascendingResponse.data.length - 1; i++) {
      const current = new Date(ascendingResponse.data[i].created_at).getTime();
      const next = new Date(ascendingResponse.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "snapshots are in ascending chronological order",
        current <= next,
      );
    }
  }

  // Test 7: Combined filters
  const combinedRequest = {
    shopping_mall_sale_id: sale.id,
    status: sale.status,
    created_at_from: thirtyDaysAgo.toISOString() satisfies string &
      tags.Format<"date-time">,
    created_at_to: now.toISOString() satisfies string &
      tags.Format<"date-time">,
    sort: "-created_at" satisfies "created_at" | "-created_at",
    limit: 5,
    page: 1,
  } satisfies IShoppingMallSaleSnapshot.IRequest;

  const combinedResponse =
    await api.functional.shoppingMall.admin.sales.snapshots.index(connection, {
      saleCode: sale.code,
      body: combinedRequest,
    });
  typia.assert(combinedResponse);
}
