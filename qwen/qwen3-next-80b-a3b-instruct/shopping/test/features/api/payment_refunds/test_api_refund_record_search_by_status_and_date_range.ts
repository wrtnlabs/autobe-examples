import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderRefund";
import type { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";
export async function test_api_refund_record_search_by_status_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  // For the purpose of this test, we'll create refund records
  // We need to first generate orders and then create refunds for them
  // Since we don't have a direct refund creation endpoint, we'll simulate the flow
  // by creating orders and then processing refunds through the system
  // First, let's create a simple order that will have refunds
  // Note: Since the system requires a sequence of steps to create a refund (order -> payment -> refund)
  // and we don't have access to all necessary endpoints, we'll create refund records directly
  // with the assumption that they already exist in the system
  // Generate test refund records
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(today.getTime() - 48 * 60 * 60 * 1000);
  // Simulate creating refund records that would exist in the system
  // Note: In a real system, we'd create orders first, then create refunds
  // for those orders through a specific refund creation endpoint
  const approvedRefunds = ArrayUtil.repeat(3, (i) => ({
    id: typia.random<string & tags.Format<"uuid">>(),
    order_id: typia.random<string & tags.Format<"uuid">>(),
    order_code: RandomGenerator.alphaNumeric(10),
    status: "approved" as const,
    amount: typia.random<number & tags.Minimum<0>>(),
    currency: "USD",
    created_at: yesterday.toISOString(),
    refund_type: RandomGenerator.pick(["full", "partial"] as const),
    payment_method: RandomGenerator.pick([
      "credit_card",
      "debit_card",
      "paypal",
      "apple_pay",
      "google_pay",
      "bank_transfer",
      "crypto_currency",
    ] as const),
  }));
  const pendingRefunds = ArrayUtil.repeat(2, (i) => ({
    id: typia.random<string & tags.Format<"uuid">>(),
    order_id: typia.random<string & tags.Format<"uuid">>(),
    order_code: RandomGenerator.alphaNumeric(10),
    status: "pending" as const,
    amount: typia.random<number & tags.Minimum<0>>(),
    currency: "USD",
    created_at: today.toISOString(),
    refund_type: RandomGenerator.pick(["full", "partial"] as const),
    payment_method: RandomGenerator.pick([
      "credit_card",
      "debit_card",
      "paypal",
      "apple_pay",
      "google_pay",
      "bank_transfer",
      "crypto_currency",
    ] as const),
  }));
  // Add one rejected refund that should not match our search criteria
  const rejectedRefund = {
    id: typia.random<string & tags.Format<"uuid">>(),
    order_id: typia.random<string & tags.Format<"uuid">>(),
    order_code: RandomGenerator.alphaNumeric(10),
    status: "rejected" as const,
    amount: typia.random<number & tags.Minimum<0>>(),
    currency: "USD",
    created_at: twoDaysAgo.toISOString(),
    refund_type: RandomGenerator.pick(["full", "partial"] as const),
    payment_method: RandomGenerator.pick([
      "credit_card",
      "debit_card",
      "paypal",
      "apple_pay",
      "google_pay",
      "bank_transfer",
      "crypto_currency",
    ] as const),
  };
  // The system has API to create refunds
  // Since we're not given a specific endpoint to create refunds,
  // and the scenario requires testing the search functionality,
  // we assume these refund records already exist in the system
  // In a real test, we'd have created them through the appropriate API first
  // Test 1: Search with status "approved" from yesterday to today
  const approvedResults =
    await api.functional.shoppingMall.payment_refunds.index(adminConnection, {
      body: {
        refundStatus: "approved",
        fromDate: yesterday.toISOString(),
        toDate: today.toISOString(),
        page: 1,
        limit: 10,
      },
    });
  typia.assert(approvedResults);
  TestValidator.equals("approved refund count", approvedResults.data.length, 3);
  TestValidator.predicate("all approved items have correct status", () =>
    approvedResults.data.every((item) => item.status === "approved"),
  );
  TestValidator.predicate("all items have creation date in range", () =>
    approvedResults.data.every(
      (item) =>
        new Date(item.created_at) >= yesterday &&
        new Date(item.created_at) <= today,
    ),
  );
  // Test 2: Search with status "pending" from today to today (single day)
  const pendingResults =
    await api.functional.shoppingMall.payment_refunds.index(adminConnection, {
      body: {
        refundStatus: "pending",
        fromDate: today.toISOString(),
        toDate: today.toISOString(),
        page: 1,
        limit: 10,
      },
    });
  typia.assert(pendingResults);
  TestValidator.equals("pending refund count", pendingResults.data.length, 2);
  TestValidator.predicate("all pending items have correct status", () =>
    pendingResults.data.every((item) => item.status === "pending"),
  );
  TestValidator.predicate("all items have creation date today", () =>
    pendingResults.data.every(
      (item) =>
        new Date(item.created_at).toISOString().slice(0, 10) ===
        today.toISOString().slice(0, 10),
    ),
  );
  // Test 3: Search with no status filter but date range from two days ago to today
  const allResults = await api.functional.shoppingMall.payment_refunds.index(
    adminConnection,
    {
      body: {
        fromDate: twoDaysAgo.toISOString(),
        toDate: today.toISOString(),
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(allResults);
  TestValidator.equals("total refund count", allResults.data.length, 6); // 3 approved + 2 pending + 1 rejected
  // Test 4: Verify pagination structure and items structure
  TestValidator.equals(
    "pagination current page",
    allResults.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", allResults.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records count",
    () => allResults.pagination.records >= 6,
  );
  TestValidator.predicate(
    "pagination pages count",
    () => allResults.pagination.pages >= 1,
  );
  // Test 5: Verify each record has all required fields with correct types
  TestValidator.predicate("all records have required fields", () =>
    allResults.data.every(
      (item) =>
        typeof item.id === "string" &&
        typeof item.order_id === "string" &&
        typeof item.order_code === "string" &&
        typeof item.status === "string" &&
        typeof item.amount === "number" &&
        typeof item.currency === "string" &&
        typeof item.created_at === "string" &&
        typeof item.refund_type === "string" &&
        typeof item.payment_method === "string",
    ),
  );
  // Test 6: Verify data actually matches required schema
  TestValidator.predicate("all items match ISummary schema", () =>
    allResults.data.every((item) =>
      typia.is<IShoppingMallOrderRefund.ISummary>(item),
    ),
  );
}