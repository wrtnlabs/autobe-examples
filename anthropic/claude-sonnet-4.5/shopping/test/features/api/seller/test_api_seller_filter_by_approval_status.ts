import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_filter_by_approval_status(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for seller filtering operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: RandomGenerator.pick([
          "super_admin",
          "moderator",
          "support",
        ] as const),
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create sellers with different approval statuses
  // We need to create sellers through the seller join endpoint
  // Note: The actual status assignment might require admin APIs to change seller status
  // For this test, we'll create sellers and then search them

  const sellerStatuses = [
    "pending",
    "approved",
    "rejected",
    "suspended",
  ] as const;
  const sellersCreated: IShoppingMallSeller.IAuthorized[] = [];

  // Create multiple sellers (4 sellers minimum to test each status)
  for (let i = 0; i < 8; i++) {
    const sellerEmail = typia.random<string & tags.Format<"email">>();
    const seller: IShoppingMallSeller.IAuthorized =
      await api.functional.auth.seller.join(connection, {
        body: {
          email: sellerEmail,
          password: typia.random<string & tags.MinLength<8>>(),
          full_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          business_name: RandomGenerator.name(2),
          business_description: RandomGenerator.paragraph({ sentences: 5 }),
          store_name: RandomGenerator.name(2),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallSeller.ICreate,
      });
    typia.assert(seller);
    sellersCreated.push(seller);
  }

  // Step 3: Test filtering by each status
  // Note: Since we just created sellers, they will likely all be "pending" status
  // The test validates the filtering mechanism works correctly

  for (const status of sellerStatuses) {
    const filteredResult: IPageIShoppingMallSeller.ISummary =
      await api.functional.shoppingMall.admin.sellers.index(connection, {
        body: {
          status: status,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSeller.IRequest,
      });
    typia.assert(filteredResult);

    // Validate pagination structure
    TestValidator.predicate(
      "pagination should have valid structure",
      filteredResult.pagination.current >= 0 &&
        filteredResult.pagination.limit >= 0 &&
        filteredResult.pagination.records >= 0 &&
        filteredResult.pagination.pages >= 0,
    );

    // Validate all returned sellers have the requested status
    for (const seller of filteredResult.data) {
      TestValidator.equals(
        `seller status should match filter: ${status}`,
        seller.status,
        status,
      );
    }

    // Log results for verification
    console.log(
      `Status ${status}: Found ${filteredResult.data.length} sellers (total: ${filteredResult.pagination.records})`,
    );
  }

  // Step 4: Test search without status filter to get all sellers
  const allSellersResult: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(allSellersResult);

  TestValidator.predicate(
    "should retrieve sellers without status filter",
    allSellersResult.data.length >= sellersCreated.length,
  );

  // Step 5: Validate that filtering works correctly by comparing counts
  // Sum of all status-filtered results should equal total sellers
  let totalFilteredCount = 0;
  for (const status of sellerStatuses) {
    const statusResult: IPageIShoppingMallSeller.ISummary =
      await api.functional.shoppingMall.admin.sellers.index(connection, {
        body: {
          status: status,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSeller.IRequest,
      });
    typia.assert(statusResult);
    totalFilteredCount += statusResult.pagination.records;
  }

  TestValidator.predicate(
    "sum of status-filtered counts should match total seller count",
    totalFilteredCount === allSellersResult.pagination.records,
  );
}
