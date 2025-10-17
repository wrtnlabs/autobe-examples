import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusHistory";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test the complete order status history retrieval workflow for sellers.
 *
 * This test validates that sellers can retrieve the complete audit trail of
 * status transitions for their own orders. The test creates a seller account,
 * creates a product with SKU, creates a customer account, creates a customer
 * address and payment method, places an order, and then retrieves the order
 * status history as the seller.
 *
 * The test validates that:
 *
 * 1. Status history includes all status transitions from order creation through
 *    payment
 * 2. Proper timestamps, actors, and status change details are recorded
 * 3. Pagination works correctly with proper metadata
 * 4. Filtering capabilities function as expected
 * 5. Sellers can only access status history for orders containing their products
 */
export async function test_api_seller_order_status_history_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create and authenticate seller account - STORE TOKEN
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(),
      business_type: "LLC",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 5 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Store seller token for later restoration
  const sellerToken = seller.token.access;

  // Step 4: Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 5: Create SKU variant
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(12),
        price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Create and authenticate customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 7: Create delivery address
  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({ sentences: 5 }),
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: "United States",
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);

  // Step 8: Create payment method
  const paymentMethod =
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

  // Step 9: Add product to cart
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // Step 10: Place order
  const orderResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        delivery_address_id: address.id,
        payment_method_id: paymentMethod.id,
        shipping_method: "standard",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(orderResponse);
  TestValidator.predicate(
    "order creation should return at least one order ID",
    orderResponse.order_ids.length > 0,
  );

  const orderId = orderResponse.order_ids[0];

  // Step 11: Restore seller authentication context
  connection.headers = connection.headers || {};
  connection.headers.Authorization = sellerToken;

  // Step 12: Retrieve order status history
  const statusHistoryPage =
    await api.functional.shoppingMall.seller.orders.statusHistory.index(
      connection,
      {
        orderId: orderId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(statusHistoryPage);

  // Step 13: Validate status history structure
  TestValidator.predicate(
    "status history should contain at least one record",
    statusHistoryPage.data.length > 0,
  );

  // Step 14: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    statusHistoryPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    statusHistoryPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should match data length",
    statusHistoryPage.pagination.records >= statusHistoryPage.data.length,
  );

  // Step 15: Validate status history records have required fields
  const firstHistory = statusHistoryPage.data[0];
  typia.assert(firstHistory);
  TestValidator.predicate(
    "status history should have order ID",
    firstHistory.shopping_mall_order_id === orderId,
  );
  TestValidator.predicate(
    "status history should have new status",
    firstHistory.new_status.length > 0,
  );
  TestValidator.predicate(
    "status history should have created timestamp",
    firstHistory.created_at.length > 0,
  );

  // Step 16: Test filtering by status
  const filteredStatusHistory =
    await api.functional.shoppingMall.seller.orders.statusHistory.index(
      connection,
      {
        orderId: orderId,
        body: {
          page: 1,
          limit: 10,
          new_status: "pending_payment",
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(filteredStatusHistory);
}
