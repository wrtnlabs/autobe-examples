import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_order_list_retrieval_by_customer(
  connection: api.IConnection,
) {
  // Authenticate customer by joining
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const joinResponse: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email,
        password: "securepassword123",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(joinResponse);

  // Create a seller
  const sellerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "hashedpassword",
    company_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerBody,
    });
  typia.assert(seller);

  // Create a product category
  const categoryBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    parent_id: null,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // Create a product
  const productBody = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: seller.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // Create an order as customer
  const orderNumber = `ORD-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const orderBody = {
    shopping_mall_customer_id: joinResponse.id,
    shopping_mall_seller_id: seller.id,
    order_number: orderNumber,
    total_price: 100.0,
    status: "pending",
    business_status: "pending",
    payment_method: "credit_card",
    shipping_address: "1234 Mockingbird Lane, Test City",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // Query order list with pagination and customer_id filter
  const searchRequest = {
    limit: 10,
    page: 1,
    shopping_mall_customer_id: joinResponse.id,
  } satisfies IShoppingMallOrder.IRequest;
  const orderPage: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.index(connection, {
      body: searchRequest,
    });
  typia.assert(orderPage);

  // Validate that created order is included in the retrieved orders
  const foundOrder = orderPage.data.find((o) => o.id === order.id);
  typia.assert(foundOrder);

  // Validate pagination metadata
  TestValidator.predicate(
    "Pagination limit should be at most 10",
    orderPage.pagination.limit <= 10,
  );
  TestValidator.predicate(
    "Current page should be 1",
    orderPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "Pages count should be >= 1",
    orderPage.pagination.pages >= 1,
  );

  // Negative test: Try to query other customer's orders - expect no access or empty
  const otherCustomerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "hashedpassword",
    status: "active",
  } satisfies IShoppingMallCustomer.ICreate;
  const otherCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: otherCustomerBody,
    });
  typia.assert(otherCustomer);

  const unauthorizedRequest = {
    limit: 10,
    page: 1,
    shopping_mall_customer_id: otherCustomer.id,
  } satisfies IShoppingMallOrder.IRequest;

  const otherCustomerOrders: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.index(connection, {
      body: unauthorizedRequest,
    });
  typia.assert(otherCustomerOrders);

  // Validate that no orders belonging to first customer appear in the other customer's list
  for (const summary of otherCustomerOrders.data) {
    TestValidator.notEquals(
      `Unauthorized order ${summary.id} belongs to logged-in user`,
      order.id,
      summary.id,
    );
  }
}
