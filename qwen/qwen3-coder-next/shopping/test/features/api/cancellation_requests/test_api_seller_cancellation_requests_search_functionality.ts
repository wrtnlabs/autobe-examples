import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_requests_search_functionality(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData = typia.random<IShoppingMallSeller.IJoin>();
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerData,
  });
  typia.assert(sellerAuthorized);
  // Create seller-specific connection with authentication token
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerAuthorized.token.access,
    },
  };
  // 2. Create multiple orders with cancellation requests
  // Using repetitive pattern for creating test data
  const orders = ArrayUtil.repeat(3, () => ({
    order_id: typia.random<string & tags.Format<"uuid">>(),
    customer: {
      id: typia.random<string & tags.Format<"uuid">>(),
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    orderItems: ArrayUtil.repeat(2, (itemIndex) => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      quantity: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
      >(),
      unit_price: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1000>
      >(),
      total_price: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1000>
      >(),
      item_status: itemIndex === 0 ? "paid" : ("shipped" as const),
      original_product_name: RandomGenerator.paragraph({ sentences: 2 }),
      original_variant_options: JSON.stringify({ size: "M", color: "Blue" }),
      created_at: new Date().toISOString(),
      productSnapshot: {
        id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: "Test product description",
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1000>
        >(),
        category: {
          id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.name(),
          description: null,
          parent: null,
          subcategory_count: 0,
        },
        product: {
          id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.paragraph({ sentences: 1 }),
          base_price: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1000>
          >(),
          is_deleted: false,
          average_rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<5>
          >(),
          seller: {
            id: sellerAuthorized.data.profile.id,
            shop_name: sellerAuthorized.data.profile.shop_name,
            approval_status: sellerAuthorized.data.profile.approval_status,
            created_at: sellerAuthorized.data.profile.created_at,
          },
          category: {
            id: typia.random<string & tags.Format<"uuid">>(),
            name: RandomGenerator.name(),
            description: null,
            parent: null,
            subcategory_count: 0,
          },
        },
      },
      variantSnapshot: {
        id: typia.random<string & tags.Format<"uuid">>(),
        product_snapshot_id: typia.random<string & tags.Format<"uuid">>(),
        sku_code: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
        >(),
        is_in_stock: true,
      },
      sellerProfileSnapshot: {
        id: typia.random<string & tags.Format<"uuid">>(),
        shop_name: sellerAuthorized.data.profile.shop_name,
        approval_status: sellerAuthorized.data.profile.approval_status,
      },
    })),
  }));
  // 3. Test search functionality
  // 3.1. Search by order ID (partial matching)
  const orderIdSearch = orders[0].order_id.substring(0, 8);
  const searchByOrderId =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerAuthConnection,
      {
        body: {
          order_id: orders[0].order_id,
          search: orderIdSearch,
          status: "pending" as const,
          limit: 10,
        },
      },
    );
  typia.assert(searchByOrderId);
  // Validate search results
  TestValidator.equals(
    "search by order ID returns results",
    searchByOrderId.data.length > 0,
    true,
  );
  // 3.2. Search by product name (case-insensitive)
  const productName = orders[0].orderItems[0].original_product_name;
  const productNameSearch = productName.substring(0, 5).toLowerCase();
  const searchByProductName =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerAuthConnection,
      {
        body: {
          search: productNameSearch,
          limit: 20,
        },
      },
    );
  typia.assert(searchByProductName);
  TestValidator.equals(
    "search by product name returns results",
    searchByProductName.data.length > 0,
    true,
  );
  // 3.3. Search by customer name
  const customerNameSearch =
    orders[0].customer.display_name?.substring(0, 4) || "";
  const searchByCustomerName =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerAuthConnection,
      {
        body: {
          search: customerNameSearch,
          limit: 15,
        },
      },
    );
  typia.assert(searchByCustomerName);
  TestValidator.equals(
    "search by customer name returns results",
    searchByCustomerName.data.length > 0,
    true,
  );
  // 3.4. Search with pagination
  const paginatedSearch =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerAuthConnection,
      {
        body: {
          search: "test",
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination returns correct structure",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit correct",
    paginatedSearch.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    paginatedSearch.pagination.records >= 0,
  );
  // 3.5. Search by seller ID
  const searchBySellerId =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerAuthConnection,
      {
        body: {
          seller_id: sellerAuthorized.data.profile.id,
          limit: 30,
        },
      },
    );
  typia.assert(searchBySellerId);
  TestValidator.equals(
    "search by seller ID returns results",
    searchBySellerId.data.length > 0,
    true,
  );
  // 3.6. Search by customer ID
  const searchByCustomerId =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerAuthConnection,
      {
        body: {
          customer_id: orders[0].customer.id,
          limit: 25,
        },
      },
    );
  typia.assert(searchByCustomerId);
  TestValidator.equals(
    "search by customer ID returns results",
    searchByCustomerId.data.length > 0,
    true,
  );
  // 3.7. Search by status
  const searchByStatus =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerAuthConnection,
      {
        body: {
          status: "pending" as const,
          limit: 20,
        },
      },
    );
  typia.assert(searchByStatus);
  TestValidator.predicate(
    "status filter works",
    searchByStatus.data.every((req) => req.status === "pending"),
  );
  // 3.8. Search by date range
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const searchByDateRange =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerAuthConnection,
      {
        body: {
          created_at_gte: oneWeekAgo.toISOString(),
          created_at_lte: new Date().toISOString(),
          limit: 50,
        },
      },
    );
  typia.assert(searchByDateRange);
  TestValidator.equals(
    "date range search returns results",
    searchByDateRange.data.length > 0,
    true,
  );
  // 4. Validate response structure for each cancellation request
  searchByOrderId.data.forEach((request, index) => {
    typia.assert<IShoppingMallOrderCancellationRequest.ISummary>(request);
    // Validate nested objects
    if (request.order_item) {
      typia.assert<IShoppingMallOrderItem.ISummary>(request.order_item);
    }
    if (request.customer) {
      typia.assert<IShoppingMallCustomer.ISummary>(request.customer);
    }
    // Validate required fields
    TestValidator.predicate(
      `request ${index} has ID`,
      typeof request.id === "string",
    );
    TestValidator.predicate(
      `request ${index} has valid status`,
      ["pending", "approved", "rejected"].includes(request.status),
    );
    TestValidator.predicate(
      `request ${index} has created_at`,
      typeof request.created_at === "string",
    );
  });
  // 5. Test case-insensitive search
  const caseInsensitiveSearch =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerAuthConnection,
      {
        body: {
          search: productName.substring(0, 6).toUpperCase(),
          limit: 10,
        },
      },
    );
  typia.assert(caseInsensitiveSearch);
  // Verify case-insensitive search still finds results
  TestValidator.equals(
    "case-insensitive search works",
    caseInsensitiveSearch.data.length > 0,
    true,
  );
  // 6. Test complex search with multiple criteria
  const complexSearch =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerAuthConnection,
      {
        body: {
          seller_id: sellerAuthorized.data.profile.id,
          status: "pending" as const,
          search: productName.substring(0, 7),
          page: 1,
          limit: 15,
        },
      },
    );
  typia.assert(complexSearch);
  TestValidator.equals(
    "complex search returns results",
    complexSearch.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "complex search status filter",
    complexSearch.data.every((req) => req.status === "pending"),
  );
  TestValidator.equals(
    "complex search pagination",
    complexSearch.pagination.limit,
    15,
  );
  // 7. Test empty search results
  const emptySearch =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerAuthConnection,
      {
        body: {
          search: "nonexistent-search-term-xyz-123",
          limit: 10,
        },
      },
    );
  typia.assert(emptySearch);
  // Verify that the search returns no results or an empty list
  TestValidator.predicate(
    "empty search returns no results",
    emptySearch.data.length === 0 || emptySearch.pagination.records === 0,
  );
}