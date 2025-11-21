import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLoyaltyPointTransaction";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoyaltyPointTransaction";

export async function test_api_admin_loyalty_points_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Generate test data for loyalty point transactions
  // We need to create multiple completed transactions to have data to retrieve
  const transactionCount = 5;
  const createdAtBase = new Date("2025-11-15T00:00:00Z");
  const transactionBodies = ArrayUtil.repeat(transactionCount, (index) => {
    const createdAt = new Date(createdAtBase.getTime() + index * 86400000); // One day apart
    return {
      customer_id: typia.random<string & tags.Format<"uuid">>(),
      order_id:
        index % 2 === 0 ? typia.random<string & tags.Format<"uuid">>() : null,
      promotion_id:
        index % 3 === 0 ? typia.random<string & tags.Format<"uuid">>() : null,
      points: (index + 1) * 100, // 100, 200, 300, etc.
      transaction_type: [
        "purchase_reward",
        "sign_up_bonus",
        "referral_bonus",
        "point_redemption",
        "admin_adjustment",
      ][index % 5] as
        | "purchase_reward"
        | "sign_up_bonus"
        | "referral_bonus"
        | "point_redemption"
        | "admin_adjustment",
      status: "completed", // Ensure all are completed for this test
      created_at: createdAt.toISOString(),
    };
  });

  // Step 3: Create the transactions through the API (this is a workaround since we need them to exist)
  // Note: The API doesn't provide a way to create loyalty point transactions directly,
  // so we must rely on the data that already exists in the system for testing.
  // Since we can't create the transactions directly in this test, we'll proceed with the retrieval
  // using the assumption that sufficient transactions exist in the system.

  // Step 4: Retrieve loyalty point transactions with pagination and filtering
  const request: IShoppingMallLoyaltyPointTransaction.IRequest = {
    page: 1,
    limit: 3, // Limit to 3 per page to test pagination
    status: ["completed"], // Only retrieve completed transactions as specified
    sortBy: "created_at",
    order: "desc", // Sort by creation date descending
  };

  const result: IPageIShoppingMallLoyaltyPointTransaction =
    await api.functional.shoppingMall.admin.promotions.loyalty_points.index(
      connection,
      {
        body: request satisfies IShoppingMallLoyaltyPointTransaction.IRequest,
      },
    );
  typia.assert(result);

  // Step 5: Validate pagination metadata
  TestValidator.equals("page number should be 1", result.pagination.current, 1);
  TestValidator.equals("limit should be 3", result.pagination.limit, 3);
  TestValidator.predicate(
    "records should be positive",
    () => result.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages should be at least 1",
    () => result.pagination.pages >= 1,
  );

  // Step 6: Validate that all returned transactions have status "completed"
  result.data.forEach((transaction) => {
    TestValidator.equals(
      "transaction status should be completed",
      transaction.status,
      "completed",
    );
  });

  // Step 7: Validate sorting by created_at in descending order
  // Check that each transaction's created_at is >= the next one (descending)
  for (let i = 0; i < result.data.length - 1; i++) {
    const current = new Date(result.data[i].created_at);
    const next = new Date(result.data[i + 1].created_at);
    TestValidator.predicate(
      `transaction ${i} should be >= transaction ${i + 1}`,
      () => current >= next,
    );
  }

  // Step 8: Validate that we're retrieving transactions across all customers
  // (We can't assert specific customer_id values since we didn't create them, but we can validate
  // that the data exists and the API works as expected)
}
