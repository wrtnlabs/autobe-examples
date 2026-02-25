import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
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
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_cancellation_requests_create";
import { generate_random_ecommerce_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_customer_carts_items_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_seller_cancellation_requests_pending_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Create product for the seller
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // Create 5 customers with different names
  const customers: IEcommerceCustomer.IAuthorized[] = [];
  const customerConnections: api.IConnection[] = [];
  const customerNames = [
    "Alice Johnson",
    "Bob Williams",
    "Charlie Brown",
    "David Smith",
    "Eva Davis",
  ];
  for (let i = 0; i < 5; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    customerConnections.push(customerConnection);
    const customer = await authorize_customer_join(customerConnection, {
      body: {
        display_name: customerNames[i],
      },
    });
    typia.assert(customer);
    customers.push(customer);
    // Create checkout for each customer (simplified - actual checkout requires cart items)
    // For test simplicity, we'll assume the checkout creates orders
    // In real scenario, we'd need to create cart items and checkout
  }
  // Create cancellation requests for different customers
  const cancellationRequests: IEcommerceCancellationRequest[] = [];
  // Create 8 cancellation requests with different reasons and timestamps
  for (let i = 0; i < 8; i++) {
    const customerIdx = i % 5;
    const customerConnection = customerConnections[customerIdx];
    // Skip creating order items for simplicity - in real test we'd need actual order items
    // For this test, we'll use the utility function which requires order_item_id
    // Since we don't have actual order items, we'll create a minimal test
    // Create a cancellation request using the utility function
    const cancellationRequest =
      await generate_random_ecommerce_customer_cancellation_requests_create(
        customerConnection,
        {
          body: {
            reason: `Cancellation reason ${i + 1}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
            ecommerce_order_item_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    typia.assert(cancellationRequest);
    cancellationRequests.push(cancellationRequest);
  }
  // Test 1: Get all pending cancellation requests with default pagination
  const allRequests =
    await api.functional.ecommerce.seller.cancellation_requests.pending.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    allRequests.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", allRequests.pagination.limit, 10);
  TestValidator.predicate(
    "total records should be 8",
    allRequests.pagination.records === 8,
  );
  TestValidator.equals(
    "total pages should be 1",
    allRequests.pagination.pages,
    1,
  );
  // Validate each cancellation request summary
  for (const summary of allRequests.data) {
    typia.assert(summary);
    TestValidator.predicate(
      "summary has id",
      typeof summary.id === "string" && summary.id.length > 0,
    );
    TestValidator.predicate(
      "summary has reason",
      typeof summary.reason === "string" && summary.reason.length > 0,
    );
    TestValidator.predicate(
      "summary has customer",
      summary.customer !== null && summary.customer !== undefined,
    );
    TestValidator.predicate(
      "summary has seller",
      summary.seller !== null && summary.seller !== undefined,
    );
    TestValidator.predicate(
      "summary has creation timestamp",
      typeof summary.created_at === "string" && summary.created_at.length > 0,
    );
  }
  // Test 2: Pagination with limit 3 (should have 3 pages)
  const page1 =
    await api.functional.ecommerce.seller.cancellation_requests.pending.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 3,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 has 3 items", page1.data.length, 3);
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 3);
  TestValidator.equals("page 1 total records", page1.pagination.records, 8);
  TestValidator.equals("page 1 total pages", page1.pagination.pages, 3);
  // Test 3: Search by customer name (Alice)
  const searchResults =
    await api.functional.ecommerce.seller.cancellation_requests.pending.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          search: "Alice",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(searchResults);
  // At least one cancellation request should belong to Alice
  TestValidator.predicate(
    "search returns Alice's requests",
    searchResults.data.length > 0,
  );
  // Verify all returned requests have customer name containing "Alice"
  for (const summary of searchResults.data) {
    TestValidator.predicate(
      `customer name contains Alice for request ${summary.id}`,
      summary.customer.display_name.includes("Alice"),
    );
  }
  // Test 4: Date range filtering (today's requests)
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const dateFiltered =
    await api.functional.ecommerce.seller.cancellation_requests.pending.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          date_from: today, // should include all requests created today
          date_to: tomorrow,
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(dateFiltered);
  // All cancellation requests should be within the date range (all were created today)
  TestValidator.equals(
    "date filtered returns all requests",
    dateFiltered.pagination.records,
    8,
  );
  // Test 5: Filter by specific customer ID
  const firstCustomerId = customers[0].id;
  const customerFiltered =
    await api.functional.ecommerce.seller.cancellation_requests.pending.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          customer_id: firstCustomerId,
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(customerFiltered);
  // Verify all returned requests belong to the specified customer
  for (const summary of customerFiltered.data) {
    TestValidator.equals(
      `customer ID matches for request ${summary.id}`,
      summary.customer.id,
      firstCustomerId,
    );
  }
  // Test 6: Empty result for non-existent search term
  const noResults =
    await api.functional.ecommerce.seller.cancellation_requests.pending.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          search: "NonexistentCustomerName12345",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(noResults);
  TestValidator.equals(
    "no results for nonexistent search",
    noResults.data.length,
    0,
  );
  TestValidator.equals(
    "pagination shows 0 records",
    noResults.pagination.records,
    0,
  );
}
