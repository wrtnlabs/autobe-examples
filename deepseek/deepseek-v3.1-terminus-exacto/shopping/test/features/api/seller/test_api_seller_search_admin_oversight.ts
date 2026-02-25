import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_seller_search_admin_oversight(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    },
  });
  // Get current timestamp for date range filtering
  const now = new Date().toISOString();
  // Create multiple test sellers - all will have 'pending_approval' status initially
  const sellers = ArrayUtil.repeat(3, (index) => ({
    email: typia.random<string & tags.Format<"email">>(),
    password: "seller123",
    shop_name: `TestShop${RandomGenerator.alphabets(5)}${index}`,
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: typia.random<string & tags.Format<"uri">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  }));
  // Register all test sellers
  for (const sellerData of sellers) {
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerConnection, {
      body: sellerData,
    });
    // Add small delay to create different created_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // Test 1: Search all sellers with pagination
  const allResults = await api.functional.ecommerce.sellers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(allResults);
  TestValidator.predicate(
    "should return pagination metadata",
    allResults.pagination.pages >= 1,
  );
  TestValidator.equals(
    "should contain data array",
    Array.isArray(allResults.data),
    true,
  );
  // Test 2: Search by partial shop name
  const searchResults = await api.functional.ecommerce.sellers.index(
    adminConnection,
    {
      body: {
        search: "TestShop",
        page: 1,
        limit: 10,
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search results should contain search term",
    searchResults.data.length > 0
      ? searchResults.data.some((seller) =>
          seller.shop_name.includes("TestShop"),
        )
      : true,
  );
  // Test 3: Filter by specific account status (focus on pending_approval since new sellers)
  const statusResults = await api.functional.ecommerce.sellers.index(
    adminConnection,
    {
      body: {
        account_status: "pending_approval",
        page: 1,
        limit: 10,
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(statusResults);
  TestValidator.predicate(
    "pending_approval filter should return correct status",
    statusResults.data.every(
      (seller) => seller.account_status === "pending_approval",
    ) || statusResults.data.length === 0,
  );
  // Test 4: Date range filtering
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dateResults = await api.functional.ecommerce.sellers.index(
    adminConnection,
    {
      body: {
        created_after: oneHourAgo,
        page: 1,
        limit: 10,
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(dateResults);
  TestValidator.predicate(
    "date filtered results should be recent",
    dateResults.data.length > 0
      ? dateResults.data.every((seller) => seller.created_at >= oneHourAgo)
      : true,
  );
  // Test 5: Combined search criteria
  const combinedResults = await api.functional.ecommerce.sellers.index(
    adminConnection,
    {
      body: {
        search: "TestShop",
        account_status: "pending_approval",
        page: 1,
        limit: 5,
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(combinedResults);
  TestValidator.predicate(
    "combined filter should respect limit",
    combinedResults.data.length <= 5,
  );
  // Test 6: Pagination validation
  const firstPage = await api.functional.ecommerce.sellers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(firstPage);
  if (firstPage.pagination.pages > 1) {
    const secondPage = await api.functional.ecommerce.sellers.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
    typia.assert(secondPage);
    TestValidator.notEquals(
      "different pages should return different results",
      firstPage.data,
      secondPage.data,
    );
  }
  // Test 7: Validate seller summary structure
  if (allResults.data.length > 0) {
    const sampleSeller = allResults.data[0];
    TestValidator.predicate(
      "seller summary should have id",
      typeof sampleSeller.id === "string",
    );
    TestValidator.predicate(
      "seller summary should have email",
      typeof sampleSeller.email === "string",
    );
    TestValidator.predicate(
      "seller summary should have shop_name",
      typeof sampleSeller.shop_name === "string",
    );
    TestValidator.predicate(
      "seller summary should have account_status",
      typeof sampleSeller.account_status === "string",
    );
    TestValidator.predicate(
      "seller summary should have created_at",
      typeof sampleSeller.created_at === "string",
    );
  }
  // Test 8: Ensure non-admin cannot access (using seller connection)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellers[0].email,
      password: "seller123",
    },
  });
  await TestValidator.error(
    "seller should not access admin endpoint",
    async () => {
      await api.functional.ecommerce.sellers.index(sellerConnection, {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceSeller.IRequest,
      });
    },
  );
}
