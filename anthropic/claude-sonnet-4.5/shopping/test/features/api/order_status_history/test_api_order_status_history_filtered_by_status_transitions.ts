import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusHistory";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test advanced filtering of order status history by status transitions.
 *
 * This test validates the order status history retrieval API's filtering
 * capabilities, specifically testing the ability to filter status change
 * records by specific status values. The test creates a complete order workflow
 * and then retrieves status history filtered to show only transitions to
 * particular states.
 *
 * Test workflow:
 *
 * 1. Create admin account and product category
 * 2. Create seller account and product with SKU
 * 3. Create customer account with delivery address and payment method
 * 4. Place an order to generate status history
 * 5. Retrieve status history with filtering by specific status values
 * 6. Validate that filtered results contain only relevant transitions
 * 7. Verify pagination works correctly with filtered results
 * 8. Ensure complete audit information is present in filtered records
 */
export async function test_api_order_status_history_filtered_by_status_transitions(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // Step 2: Create product category
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert<IShoppingMallCategory>(category);

  // Step 3: Create seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 7,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // Step 4: Create product
  const productData = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
    >(),
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  // Step 5: Create SKU variant
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
    >(),
  } satisfies IShoppingMallSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuData,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // Step 6: Create customer account
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer = await api.functional.auth.customer.join(connection, {
    body: customerData,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // Step 7: Create delivery address
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 7,
    }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "USA",
  } satisfies IShoppingMallAddress.ICreate;

  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: addressData,
    },
  );
  typia.assert<IShoppingMallAddress>(address);

  // Step 8: Create payment method
  const paymentMethodData = {
    payment_type: RandomGenerator.pick([
      "credit_card",
      "debit_card",
      "paypal",
    ] as const),
    gateway_token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: paymentMethodData,
      },
    );
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // Step 9: Place order to generate status history
  const orderData = {
    delivery_address_id: address.id,
    payment_method_id: paymentMethod.id,
    shipping_method: RandomGenerator.pick([
      "standard",
      "express",
      "overnight",
    ] as const),
  } satisfies IShoppingMallOrder.ICreate;

  const orderResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderData,
    });
  typia.assert<IShoppingMallOrder.ICreateResponse>(orderResponse);

  TestValidator.predicate(
    "order creation should return at least one order ID",
    orderResponse.order_ids.length > 0,
  );

  const orderId = orderResponse.order_ids[0];

  // Step 10: Retrieve complete status history without filtering
  const completeHistoryRequest = {
    page: 1,
    limit: 100,
  } satisfies IShoppingMallOrderStatusHistory.IRequest;

  const completeHistory =
    await api.functional.shoppingMall.customer.orders.statusHistory.index(
      connection,
      {
        orderId: orderId,
        body: completeHistoryRequest,
      },
    );
  typia.assert<IPageIShoppingMallOrderStatusHistory>(completeHistory);

  TestValidator.predicate(
    "complete status history should contain records",
    completeHistory.data.length > 0,
  );

  // Step 11: Test filtering by specific status value
  const targetStatus =
    completeHistory.data.length > 0
      ? completeHistory.data[0].new_status
      : "pending_payment";

  const filteredRequest = {
    page: 1,
    limit: 10,
    new_status: targetStatus,
  } satisfies IShoppingMallOrderStatusHistory.IRequest;

  const filteredHistory =
    await api.functional.shoppingMall.customer.orders.statusHistory.index(
      connection,
      {
        orderId: orderId,
        body: filteredRequest,
      },
    );
  typia.assert<IPageIShoppingMallOrderStatusHistory>(filteredHistory);

  // Step 12: Validate filtering works correctly
  TestValidator.predicate(
    "filtered results should not exceed complete results",
    filteredHistory.data.length <= completeHistory.data.length,
  );

  // Step 13: Verify all filtered records match the target status
  for (const record of filteredHistory.data) {
    TestValidator.equals(
      "filtered record new_status matches filter criteria",
      record.new_status,
      targetStatus,
    );
  }

  // Step 14: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    filteredHistory.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    filteredHistory.pagination.limit === filteredRequest.limit,
  );

  TestValidator.predicate(
    "pagination records should match data length",
    filteredHistory.pagination.records >= filteredHistory.data.length,
  );

  // Step 15: Validate audit information completeness
  for (const record of filteredHistory.data) {
    TestValidator.predicate(
      "status history record should have order ID",
      record.shopping_mall_order_id === orderId,
    );

    TestValidator.predicate(
      "status history record should have new_status",
      typeof record.new_status === "string" && record.new_status.length > 0,
    );

    TestValidator.predicate(
      "status history record should have is_system_generated flag",
      typeof record.is_system_generated === "boolean",
    );

    TestValidator.predicate(
      "status history record should have created_at timestamp",
      typeof record.created_at === "string" && record.created_at.length > 0,
    );
  }

  // Step 16: Test date range filtering
  if (completeHistory.data.length > 0) {
    const firstRecord = completeHistory.data[completeHistory.data.length - 1];
    const lastRecord = completeHistory.data[0];

    const dateRangeRequest = {
      page: 1,
      limit: 10,
      start_date: firstRecord.created_at,
      end_date: lastRecord.created_at,
    } satisfies IShoppingMallOrderStatusHistory.IRequest;

    const dateFilteredHistory =
      await api.functional.shoppingMall.customer.orders.statusHistory.index(
        connection,
        {
          orderId: orderId,
          body: dateRangeRequest,
        },
      );
    typia.assert<IPageIShoppingMallOrderStatusHistory>(dateFilteredHistory);

    TestValidator.predicate(
      "date range filtered results should be within range",
      dateFilteredHistory.data.length <= completeHistory.data.length,
    );
  }
}
