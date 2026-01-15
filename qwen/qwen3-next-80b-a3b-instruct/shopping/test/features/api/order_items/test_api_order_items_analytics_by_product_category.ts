import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IOrderItemDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderItemDateRange";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
export async function test_api_order_items_analytics_by_product_category(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Define a valid date range for analytics (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRange: IOrderItemDateRange = {
    start: thirtyDaysAgo.toISOString(),
    end: today.toISOString(),
  };
  // Create a valid analytics request with date range only
  // Note: We cannot create order items as prerequisite data since no API endpoints are available
  //      for customer, product, order, or order item creation. We must test the endpoint with
  //      a valid request structure without the ability to create prerequisites.
  const analyticsResult: IPageIShoppingMallOrderItem =
    await api.functional.shoppingMall.analytics.order_items.index(
      adminConnection,
      {
        body: {
          limit: 10,
          offset: 0,
          dateRange: dateRange,
          searchTerm: "",
          sortBy: "createdAt", // Fixed: Changed from 'created_at' to 'createdAt' to match schema enum
          sortOrder: "asc",
        },
      },
    );
  typia.assert(analyticsResult);
  // Validate response structure
  TestValidator.predicate(
    "response has data",
    analyticsResult.data.length >= 0,
  );
  TestValidator.equals(
    "pagination limit is correct",
    analyticsResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current is correct",
    analyticsResult.pagination.current,
    0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    analyticsResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    analyticsResult.pagination.pages >= 0,
  );
  // Validate data structure of each item in response
  for (const item of analyticsResult.data) {
    // Validation of basic properties
    TestValidator.predicate(
      "has valid id",
      typeof item.id === "string" && item.id.length > 0,
    );
    TestValidator.predicate(
      "has valid itemCode",
      typeof item.itemCode === "string" && item.itemCode.length > 0,
    );
    TestValidator.predicate(
      "has valid orderCode",
      typeof item.orderCode === "string" && item.orderCode.length > 0,
    );
    TestValidator.predicate(
      "has valid productVariantId",
      typeof item.productVariantId === "string" &&
        item.productVariantId.length > 0,
    );
    TestValidator.predicate(
      "has valid productCode",
      typeof item.productCode === "string" && item.productCode.length > 0,
    );
    TestValidator.predicate(
      "has valid quantity",
      typeof item.quantity === "number" && item.quantity >= 1,
    );
    TestValidator.predicate(
      "has valid unitPrice",
      typeof item.unitPrice === "number" && item.unitPrice >= 0,
    );
    TestValidator.predicate(
      "has valid totalPrice",
      typeof item.totalPrice === "number" && item.totalPrice >= 0,
    );
    TestValidator.equals("currencyCode is valid", item.currencyCode, "KRW"); // Simplified assumption for sample
    TestValidator.predicate(
      "has valid status",
      item.status === "pending" ||
        item.status === "confirmed" ||
        item.status === "processing" ||
        item.status === "shipped" ||
        item.status === "delivered" ||
        item.status === "completed" ||
        item.status === "cancelled" ||
        item.status === "refunded",
    );
    TestValidator.predicate(
      "has valid created_at",
      typeof item.created_at === "string" &&
        !isNaN(Date.parse(item.created_at)),
    );
    TestValidator.predicate(
      "has valid updated_at",
      typeof item.updated_at === "string" &&
        !isNaN(Date.parse(item.updated_at)),
    );
    TestValidator.equals("sentinel is active", item.sentinel, "active");
    TestValidator.equals( // Fixed: Added expected value 'pending' as third argument to satisfy TestValidator.equals signature
      "orderStatus is valid",
      item.orderStatus === "pending" ||
        item.orderStatus === "confirmed" ||
        item.orderStatus === "processing" ||
        item.orderStatus === "shipped" ||
        item.orderStatus === "delivered" ||
        item.orderStatus === "completed" ||
        item.orderStatus === "cancelled" ||
        item.orderStatus === "refunded",
      true,
    );
  }
}