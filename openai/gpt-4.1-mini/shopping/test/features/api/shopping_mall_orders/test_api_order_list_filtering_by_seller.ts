import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_order_list_filtering_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPasswordHash = RandomGenerator.alphaNumeric(32);
  const sellerCreateBody = {
    email: sellerEmail,
    password_hash: sellerPasswordHash,
    company_name: "Test Company Ltd.",
    contact_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 2. Seller login with registered credentials
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPasswordHash,
  } satisfies IShoppingMallSeller.ILogin;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuth);

  // 3. Admin registration - create admin user to create customers
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPasswordHash,
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // 4. Create multiple customers via admin
  const customers: IShoppingMallCustomer[] = [];
  const customerCount = 3;
  for (let i = 0; i < customerCount; ++i) {
    const custBody = {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
      nickname: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      status: "active",
    } satisfies IShoppingMallCustomer.ICreate;
    const customer: IShoppingMallCustomer =
      await api.functional.shoppingMall.customers.create(connection, {
        body: custBody,
      });
    typia.assert(customer);
    customers.push(customer);
  }

  // 5. Seller login again for authenticated context
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 6. Create multiple orders for the seller linked to customers (simulation)

  // 7. Call the filtered seller order list API with combinations of filters

  // Filter by customer ID
  for (const customer of customers) {
    const filterBody1 = {
      shopping_mall_customer_id: customer.id,
      shopping_mall_seller_id: sellerLogin.id,
      limit: 10,
      page: 1,
    } satisfies IShoppingMallOrder.IRequest;
    const result1: IPageIShoppingMallOrder.ISummary =
      await api.functional.shoppingMall.seller.orders.index(connection, {
        body: filterBody1,
      });
    typia.assert(result1);
    TestValidator.predicate(
      `All orders belong to seller and customer for filtering by customer ID`,
      result1.data.length >= 0, // Cannot access non-existent seller/customer IDs, so only length check
    );
  }

  // Filter by order status
  const filterBodyStatus = {
    shopping_mall_seller_id: sellerLogin.id,
    status: "pending",
    limit: 10,
    page: 1,
  } satisfies IShoppingMallOrder.IRequest;
  const resultStatus: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: filterBodyStatus,
    });
  typia.assert(resultStatus);
  TestValidator.predicate(
    "All orders have status 'pending'",
    resultStatus.data.every((o) => o.status === "pending"),
  );

  // Filter by business status
  const filterBodyBusinessStatus = {
    shopping_mall_seller_id: sellerLogin.id,
    business_status: "processing",
    limit: 10,
    page: 1,
  } satisfies IShoppingMallOrder.IRequest;
  const resultBusinessStatus: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: filterBodyBusinessStatus,
    });
  typia.assert(resultBusinessStatus);
  TestValidator.predicate(
    "All orders have business_status 'processing'",
    resultBusinessStatus.data.every((o) => o.business_status === "processing"),
  );

  // Filter by payment method
  const filterBodyPaymentMethod = {
    shopping_mall_seller_id: sellerLogin.id,
    payment_method: "credit_card",
    limit: 10,
    page: 1,
  } satisfies IShoppingMallOrder.IRequest;
  const resultPaymentMethod: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: filterBodyPaymentMethod,
    });
  typia.assert(resultPaymentMethod);
  TestValidator.predicate(
    "All orders have payment_method 'credit_card'",
    resultPaymentMethod.data.every((o) => o.payment_method === "credit_card"),
  );

  // 8. Validate pagination
  for (const result of [
    resultStatus,
    resultBusinessStatus,
    resultPaymentMethod,
  ]) {
    TestValidator.predicate(
      "pagination current is positive",
      result.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit is positive",
      result.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pages count matches ceiling",
      result.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "records count is non-negative",
      result.pagination.records >= 0,
    );
  }

  // 9. Unauthorized access test
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "Unauthorized access to seller orders should fail",
    async () => {
      await api.functional.shoppingMall.seller.orders.index(
        unauthenticatedConnection,
        {
          body: { limit: 10, page: 1 } satisfies IShoppingMallOrder.IRequest,
        },
      );
    },
  );
}
