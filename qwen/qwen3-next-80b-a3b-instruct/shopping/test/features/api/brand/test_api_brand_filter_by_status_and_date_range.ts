import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductBrand";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBrand";
import { prepare_random_shopping_mall_product_brand } from "../../../prepare/prepare_random_shopping_mall_product_brand";
import { generate_random_shopping_mall_admin_brands_create } from "../../../generate/generate_random_shopping_mall_admin_brands_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_brand_filter_by_status_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create test brands with varying status and creation dates spanning 30 days
  const createdBrands: IShoppingMallProductBrand[] = [];
  const baseDate = new Date();
  const statusOptions = ["active", "archived", "disabled"] as const;
  // Create 5 brands with different statuses and creation dates
  for (let i = 0; i < 5; i++) {
    const daysAgo = Math.floor(Math.random() * 30); // Random day within last 30 days
    const creationDate = new Date(
      baseDate.getTime() - daysAgo * 24 * 60 * 60 * 1000,
    );
    const status = RandomGenerator.pick(statusOptions);
    const brand = await generate_random_shopping_mall_admin_brands_create(
      adminConnection,
      {
        body: {
          name: `Brand ${i + 1} - ${status} - ${creationDate.toISOString().split("T")[0]}`,
        } satisfies IShoppingMallProductBrand.ICreate,
      },
    );
    // Update brand creation date to simulate different creation times
    // Note: This is a simulation - in reality, we'd need to store the expected creation date
    // and use it in our filter comparison
    createdBrands.push({
      ...brand,
      created_at: creationDate.toISOString(),
    });
  }
  // Step 3: Test filter combinations
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  // Test 1: Filter by status 'active' and date range 15-30 days ago
  const activeFiltered = await api.functional.shoppingMall.brands.index(
    adminConnection,
    {
      body: {
        status: "active",
        createdAfter: fifteenDaysAgo.toISOString(),
        createdBefore: thirtyDaysAgo.toISOString(),
      } satisfies IShoppingMallProductBrand.IRequest,
    },
  );
  typia.assert(activeFiltered);
  // Verify only active brands within the date range are returned
  for (const brand of activeFiltered.data) {
    TestValidator.equals("brand status is active", brand.status, "active");
    const createdDate = new Date(brand.created_at);
    TestValidator.predicate(
      "brand created after 15 days ago",
      createdDate >= fifteenDaysAgo,
    );
    TestValidator.predicate(
      "brand created before 30 days ago",
      createdDate <= thirtyDaysAgo,
    );
  }
  // Test 2: Filter by status 'archived' and date range last 30 days
  const archivedFiltered = await api.functional.shoppingMall.brands.index(
    adminConnection,
    {
      body: {
        status: "inactive", // Mapping archived to inactive for API compatibility
        createdAfter: thirtyDaysAgo.toISOString(),
      } satisfies IShoppingMallProductBrand.IRequest,
    },
  );
  typia.assert(archivedFiltered);
  // Verify only archived brands within the date range are returned
  for (const brand of archivedFiltered.data) {
    TestValidator.equals("brand status is archived", brand.status satisfies string as string, "archived");
    const createdDate = new Date(brand.created_at);
    TestValidator.predicate(
      "brand created after 30 days ago",
      createdDate >= thirtyDaysAgo,
    );
  }
  // Test 3: Filter by status 'pending_approval' (should return empty if none exist)
  const pendingFiltered = await api.functional.shoppingMall.brands.index(
    adminConnection,
    {
      body: {
        status: "pending_approval",
        createdAfter: thirtyDaysAgo.toISOString(),
      } satisfies IShoppingMallProductBrand.IRequest,
    },
  );
  typia.assert(pendingFiltered);
  // Verify no brands with status 'pending_approval' exist (assuming we didn't create any)
  TestValidator.equals(
    "pending_approval count is 0",
    pendingFiltered.data.length,
    0,
  );
  // Test 4: Filter by multiple statuses using multiple API calls (as single status per call)
  const allStatuses = ["active", "archived", "disabled"];
  const allBrands: IShoppingMallProductBrand.ISummary[] = [];
  for (const status of allStatuses) {
    const mappedStatus: "active" | "inactive" | "pending_approval" = status === "active" ? "active" : status === "archived" ? "inactive" : "pending_approval";
    const filtered = await api.functional.shoppingMall.brands.index(
      adminConnection,
      {
        body: {
          status: mappedStatus,
          createdAfter: thirtyDaysAgo.toISOString(),
        } satisfies IShoppingMallProductBrand.IRequest,
      },
    );
    typia.assert(filtered);
    allBrands.push(...filtered.data);
  }
  // Verify we got back all created brands
  TestValidator.predicate(
    "total brands count matches expectation",
    allBrands.length === createdBrands.length,
  );
}