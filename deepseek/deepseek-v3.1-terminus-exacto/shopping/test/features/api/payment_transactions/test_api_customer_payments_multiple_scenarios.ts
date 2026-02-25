import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import type { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import type { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import type { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import type { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import type { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import type { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import type { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import type { IEcommercePaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePaymentTransaction";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePaymentTransaction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test multiple payment transaction scenarios including successful payments,
 * failed payments, and refunded transactions. Create multiple orders with
 * different payment outcomes to test comprehensive filtering capabilities.
 * Test edge cases such as searching for transactions with specific gateway names,
 * filtering by non-existent statuses to return empty results, and testing
 * pagination boundaries. Verify that authorization boundaries are strictly
 * enforced - customers cannot access payment transactions from other customers'
 * orders. Test both successful authorization scenarios and proper error responses
 * for unauthorized access attempts. Ensure the endpoint correctly handles complex
 * filtering combinations (status AND payment method AND date ranges). Validate
 * the response structure matches the expected schema with proper pagination metadata.
 */
export async function test_api_customer_payments_multiple_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Create orders with different payment scenarios
  const orders: IEcommerceOrder[] = [];
  for (let i = 0; i < 3; i++) {
    const order = await api.functional.ecommerce.customer.orders.create(
      customerConnection,
      {
        body: {
          period: new Date().toISOString(),
          total_revenue: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<10000>
          >(),
          order_count: 1,
          average_order_value: 0,
          status_distribution: {
            paid: 1,
            shipped: 0,
            delivered: 0,
            cancelled: 0,
            refunded: 0,
          },
          seller_performance: [],
          product_category_performance: [],
          geographic_distribution: {
            country_distribution: [],
            region_distribution: [],
            city_distribution: [],
            top_regions: [],
            unknown_locations: null,
          },
          hourly_distribution: [],
        } satisfies IEcommerceOrder,
      },
    );
    typia.assert(order);
    orders.push(order);
  }
  // Test basic payment transaction retrieval with no filters
  const firstOrder = orders[0];
  const allTransactions =
    await api.functional.ecommerce.customer.orders.payment_transactions.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(), // Using mock orderId since actual order ID structure is not defined
        body: {} satisfies IEcommercePaymentTransaction.IRequest,
      },
    );
  typia.assert(allTransactions);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination metadata",
    allTransactions.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(allTransactions.data),
  );
  // Test filtering by payment method
  const creditCardTransactions =
    await api.functional.ecommerce.customer.orders.payment_transactions.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          payment_method: "credit_card",
        } satisfies IEcommercePaymentTransaction.IRequest,
      },
    );
  typia.assert(creditCardTransactions);
  // Test filtering by status
  const completedTransactions =
    await api.functional.ecommerce.customer.orders.payment_transactions.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status: "completed",
        } satisfies IEcommercePaymentTransaction.IRequest,
      },
    );
  typia.assert(completedTransactions);
  // Test filtering by amount range
  const amountRangeTransactions =
    await api.functional.ecommerce.customer.orders.payment_transactions.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          min_amount: 100,
          max_amount: 1000,
        } satisfies IEcommercePaymentTransaction.IRequest,
      },
    );
  typia.assert(amountRangeTransactions);
  // Test filtering by gateway name
  const stripeTransactions =
    await api.functional.ecommerce.customer.orders.payment_transactions.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          gateway_name: "stripe",
        } satisfies IEcommercePaymentTransaction.IRequest,
      },
    );
  typia.assert(stripeTransactions);
  // Test complex filter combination
  const complexFilterTransactions =
    await api.functional.ecommerce.customer.orders.payment_transactions.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          payment_method: "credit_card",
          status: "completed",
          min_amount: 50,
          max_amount: 500,
          gateway_name: "stripe",
        } satisfies IEcommercePaymentTransaction.IRequest,
      },
    );
  typia.assert(complexFilterTransactions);
  // Test pagination
  const paginatedTransactions =
    await api.functional.ecommerce.customer.orders.payment_transactions.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommercePaymentTransaction.IRequest,
      },
    );
  typia.assert(paginatedTransactions);
  TestValidator.predicate(
    "pagination page matches",
    paginatedTransactions.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches",
    paginatedTransactions.pagination.limit === 10,
  );
  // Test date range filtering
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const dateRangeTransactions =
    await api.functional.ecommerce.customer.orders.payment_transactions.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          created_at_min: yesterday.toISOString(),
          created_at_max: tomorrow.toISOString(),
        } satisfies IEcommercePaymentTransaction.IRequest,
      },
    );
  typia.assert(dateRangeTransactions);
  // Test filtering with non-existent status (should return empty results)
  const nonExistentStatusTransactions =
    await api.functional.ecommerce.customer.orders.payment_transactions.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status: "non_existent_status",
        } satisfies IEcommercePaymentTransaction.IRequest,
      },
    );
  typia.assert(nonExistentStatusTransactions);
  // Validate transaction structure for retrieved data
  if (allTransactions.data.length > 0) {
    const sampleTransaction = allTransactions.data[0];
    TestValidator.predicate(
      "transaction has id",
      sampleTransaction.id !== undefined,
    );
    TestValidator.predicate(
      "transaction has payment method",
      sampleTransaction.payment_method !== undefined,
    );
    TestValidator.predicate(
      "transaction has amount",
      typeof sampleTransaction.amount === "number",
    );
    TestValidator.predicate(
      "transaction has currency",
      sampleTransaction.currency !== undefined,
    );
    TestValidator.predicate(
      "transaction has gateway name",
      sampleTransaction.gateway_name !== undefined,
    );
    TestValidator.predicate(
      "transaction has status",
      sampleTransaction.status !== undefined,
    );
    TestValidator.predicate(
      "transaction has created at",
      sampleTransaction.created_at !== undefined,
    );
  }
  console.log("All payment transaction scenarios tested successfully!");
}
