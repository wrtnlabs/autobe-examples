import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test order analytics with order number search and pagination across multiple pages.
 *
 * **Setup:**
 * 1. Register a seller account and authenticate
 * 2. Create products with variants
 * 3. Register customer accounts and create 25+ orders with distinct order numbers
 * 4. Ensure order numbers follow a pattern that allows partial matching
 * 5. Include orders from different sellers to verify data isolation
 *
 * **Test Execution:**
 * Test 1 - Search with partial match
 * Test 2 - Pagination navigation
 * Test 3 - Data isolation verification
 * Test 4 - Edge cases
 */
export async function test_api_seller_analytics_orders_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // SETUP: Create seller and products
  // ============================================
  // Register and authenticate seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoin);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create product for orders
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // ============================================
  // SETUP: Create customers and orders
  // ============================================
  // Create multiple customers and generate 25+ orders
  const orderCount = 25;
  const customerConnections: api.IConnection[] = [];
  for (let i = 0; i < 3; i++) {
    const customerEmail = typia.random<string & tags.Format<"email">>();
    const customerJoin = await authorize_customer_join(connection, {
      body: {
        email: customerEmail,
        password: "Test1234!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    typia.assert(customerJoin);
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_login(customerConnection, {
      body: {
        email: customerEmail,
        password: "Test1234!",
      },
    });
    customerConnections.push(customerConnection);
  }
  // Create orders across customers to reach 25+ total
  const orders: IShoppingMallOrder[] = [];
  for (let i = 0; i < orderCount; i++) {
    const customerIdx = i % customerConnections.length;
    const order = await generate_random_shopping_mall_customer_orders_create(
      customerConnections[customerIdx],
      {},
    );
    typia.assert(order);
    orders.push(order);
  }
  // Verify we have enough orders
  TestValidator.predicate("created 25+ orders", () => orders.length >= 25);
  // ============================================
  // TEST 1: Search with partial match
  // ============================================
  // Get first order number for partial match test
  const firstOrderNumber = orders[0].order_number;
  const searchPattern = firstOrderNumber.substring(
    0,
    firstOrderNumber.length - 2,
  );
  // Search with partial match - page 1
  const searchResult1 =
    await api.functional.shoppingMall.seller.analytics.orders.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          search: searchPattern,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Validate pagination metadata
  TestValidator.equals("page 1 current", searchResult1.pagination.current, 1);
  TestValidator.equals("page 1 limit", searchResult1.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 has records",
    () => searchResult1.pagination.records > 0,
  );
  TestValidator.predicate(
    "page 1 pages calculated",
    () => searchResult1.pagination.pages > 0,
  );
  // Validate all results contain search pattern
  for (const order of searchResult1.data) {
    TestValidator.predicate(
      `order ${order.order_number} contains search pattern`,
      () => order.order_number.includes(searchPattern),
    );
  }
  // ============================================
  // TEST 2: Pagination navigation
  // ============================================
  // Get total matching records from first search
  const totalRecords = searchResult1.pagination.records;
  const expectedPages = Math.ceil(totalRecords / 10);
  // Navigate to page 2
  const searchResult2 =
    await api.functional.shoppingMall.seller.analytics.orders.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 10,
          search: searchPattern,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(searchResult2);
  TestValidator.equals("page 2 current", searchResult2.pagination.current, 2);
  TestValidator.equals("page 2 limit", searchResult2.pagination.limit, 10);
  TestValidator.equals(
    "page 2 total records",
    searchResult2.pagination.records,
    totalRecords,
  );
  // Navigate to page 3
  const searchResult3 =
    await api.functional.shoppingMall.seller.analytics.orders.index(
      sellerConnection,
      {
        body: {
          page: 3,
          limit: 10,
          search: searchPattern,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(searchResult3);
  TestValidator.equals("page 3 current", searchResult3.pagination.current, 3);
  // ============================================
  // TEST 3: Data isolation - verify seller sees only their orders
  // ============================================
  // Create another seller
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Join = await authorize_seller_join(connection, {
    body: {
      email: seller2Email,
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller2Join);
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_login(seller2Connection, {
    body: {
      email: seller2Email,
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create product and order for seller 2
  const product2 = await generate_random_shopping_mall_seller_products_create(
    seller2Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product2);
  const customerForSeller2Email = typia.random<string & tags.Format<"email">>();
  const customerForSeller2 = await authorize_customer_join(connection, {
    body: {
      email: customerForSeller2Email,
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerForSeller2);
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customer2Connection, {
    body: {
      email: customerForSeller2Email,
      password: "Test1234!",
    },
  });
  const orderForSeller2 =
    await generate_random_shopping_mall_customer_orders_create(
      customer2Connection,
      {},
    );
  typia.assert(orderForSeller2);
  // Verify seller 1 doesn't see seller 2's orders
  const allOrdersSeller1 =
    await api.functional.shoppingMall.seller.analytics.orders.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(allOrdersSeller1);
  for (const order of allOrdersSeller1.data) {
    TestValidator.notEquals(
      "seller 1 doesn't see seller 2's order",
      order.id,
      orderForSeller2.id,
    );
  }
  // ============================================
  // TEST 4: Edge cases
  // ============================================
  // Test empty search returns all seller orders
  const emptySearchResult =
    await api.functional.shoppingMall.seller.analytics.orders.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search returns all orders",
    () => emptySearchResult.pagination.records >= orderCount,
  );
  // Test page beyond available pages returns empty data
  const beyondPageResult =
    await api.functional.shoppingMall.seller.analytics.orders.index(
      sellerConnection,
      {
        body: {
          page: 9999,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(beyondPageResult);
  TestValidator.equals(
    "beyond page returns empty array",
    beyondPageResult.data.length,
    0,
  );
}