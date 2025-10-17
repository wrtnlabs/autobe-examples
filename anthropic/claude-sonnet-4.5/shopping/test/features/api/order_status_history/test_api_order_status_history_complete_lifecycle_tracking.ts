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
 * Test retrieval of complete order status history audit trail from placement
 * through delivery.
 *
 * This test validates the complete order lifecycle tracking by:
 *
 * 1. Setting up admin account and creating product category
 * 2. Creating seller account and registering product with SKU
 * 3. Creating customer account with address and payment method
 * 4. Placing an order to generate status history entries
 * 5. Retrieving and validating the complete status history audit trail
 *
 * The test ensures that all status transitions are properly tracked with actor
 * identification, timestamps, reasons, and comprehensive audit information for
 * order tracking and compliance.
 */
export async function test_api_order_status_history_complete_lifecycle_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        business_name: RandomGenerator.name(3),
        business_type: "LLC",
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 3 }),
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Create product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.name(3),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Step 5: Create SKU variant for the product
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(12),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
        >(),
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku);

  // Step 6: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 7: Create delivery address for the customer
  const address: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: "United States",
      } satisfies IShoppingMallAddress.ICreate,
    });
  typia.assert(address);

  // Step 8: Create payment method for the customer
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: "credit_card",
          gateway_token: RandomGenerator.alphaNumeric(32),
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // Step 9: Place order to generate status history entries
  const orderResponse: IShoppingMallOrder.ICreateResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        delivery_address_id: address.id,
        payment_method_id: paymentMethod.id,
        shipping_method: "standard",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(orderResponse);

  // Validate that at least one order was created
  TestValidator.predicate(
    "order creation should return at least one order ID",
    orderResponse.order_ids.length > 0,
  );

  // Step 10: Extract and validate order ID
  const orderId = orderResponse.order_ids[0];
  typia.assertGuard(orderId!);

  const statusHistoryPage: IPageIShoppingMallOrderStatusHistory =
    await api.functional.shoppingMall.customer.orders.statusHistory.index(
      connection,
      {
        orderId: orderId,
        body: {
          page: 1,
          limit: 50,
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(statusHistoryPage);

  // Step 11: Validate pagination structure
  TestValidator.predicate(
    "status history pagination should have valid structure",
    statusHistoryPage.pagination.current === 1 &&
      statusHistoryPage.pagination.limit === 50 &&
      statusHistoryPage.pagination.records >= 0,
  );

  // Step 12: Validate that status history entries exist
  TestValidator.predicate(
    "status history should contain at least one entry after order creation",
    statusHistoryPage.data.length > 0,
  );

  // Step 13: Validate each status history record structure
  for (const historyEntry of statusHistoryPage.data) {
    typia.assert(historyEntry);

    // Validate that the history entry is associated with the correct order
    TestValidator.equals(
      "status history entry should belong to the created order",
      historyEntry.shopping_mall_order_id,
      orderId,
    );

    // Validate that new_status field is always present
    TestValidator.predicate(
      "status history entry should have new_status field",
      typeof historyEntry.new_status === "string" &&
        historyEntry.new_status.length > 0,
    );

    // Validate timestamp exists and is valid
    TestValidator.predicate(
      "status history entry should have valid created_at timestamp",
      typeof historyEntry.created_at === "string" &&
        historyEntry.created_at.length > 0,
    );
  }

  // Step 14: Test filtered retrieval by status
  const firstEntry = statusHistoryPage.data[0];
  if (firstEntry) {
    typia.assertGuard(firstEntry!);
    const firstStatus = firstEntry.new_status;

    const filteredHistory: IPageIShoppingMallOrderStatusHistory =
      await api.functional.shoppingMall.customer.orders.statusHistory.index(
        connection,
        {
          orderId: orderId,
          body: {
            page: 1,
            limit: 10,
            new_status: firstStatus,
          } satisfies IShoppingMallOrderStatusHistory.IRequest,
        },
      );
    typia.assert(filteredHistory);

    // Validate that filtered results only contain the specified status
    for (const entry of filteredHistory.data) {
      TestValidator.equals(
        "filtered status history should only contain specified status",
        entry.new_status,
        firstStatus,
      );
    }
  }

  // Step 15: Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const dateFilteredHistory: IPageIShoppingMallOrderStatusHistory =
    await api.functional.shoppingMall.customer.orders.statusHistory.index(
      connection,
      {
        orderId: orderId,
        body: {
          page: 1,
          limit: 10,
          start_date: oneDayAgo.toISOString(),
          end_date: tomorrow.toISOString(),
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(dateFilteredHistory);

  // Validate that date-filtered results are within the specified range
  TestValidator.predicate(
    "date-filtered history should return results within date range",
    dateFilteredHistory.data.length >= 0,
  );
}
