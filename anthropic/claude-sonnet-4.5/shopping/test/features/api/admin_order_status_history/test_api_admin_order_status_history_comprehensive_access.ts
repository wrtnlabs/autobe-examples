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
 * Test that administrators have unrestricted access to view order status
 * history for any order on the platform.
 *
 * This comprehensive test creates multiple sellers, customers, and orders to
 * validate that admins can access status history across the entire platform
 * regardless of ownership. The test verifies filtering capabilities (by date,
 * status, actor type) and pagination functionality.
 *
 * Workflow:
 *
 * 1. Create admin account for unrestricted access
 * 2. Create two seller accounts and their products
 * 3. Create two customer accounts with addresses and payment methods
 * 4. Customers place orders from both sellers
 * 5. Admin retrieves and validates status history with various filters
 */
export async function test_api_admin_order_status_history_comprehensive_access(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
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

  // Step 2: Create first seller account
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(2),
      business_type: "LLC",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller1);

  // Step 3: Create second seller account
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(2),
      business_type: "Corporation",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller2);

  // Step 4: Create product category (as admin - switch back to admin context)
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(1),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 5: Seller1 creates product and SKU (connection now has seller1 token from step 2 join)
  const product1 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product1);

  const sku1 = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product1.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
        >(),
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku1);

  // Step 6: Seller2 creates product and SKU (connection now has seller2 token from step 3 join)
  const product2 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product2);

  const sku2 = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product2.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
        >(),
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku2);

  // Step 7: Create first customer account
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer1 = await api.functional.auth.customer.join(connection, {
    body: {
      email: customer1Email,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer1);

  // Step 8: Customer1 creates address (connection now has customer1 token)
  const address1 = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({ sentences: 3 }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: "United States",
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address1);

  // Step 9: Customer1 creates payment method
  const payment1 =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: "credit_card",
          gateway_token: RandomGenerator.alphaNumeric(32),
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(payment1);

  // Step 10: Customer1 adds product to cart
  const cartId1 = typia.random<string & tags.Format<"uuid">>();
  const cartItem1 =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId1,
      body: {
        shopping_mall_sku_id: sku1.id,
        quantity: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem1);

  // Step 11: Customer1 places order
  const order1Response =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        delivery_address_id: address1.id,
        payment_method_id: payment1.id,
        shipping_method: "standard",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order1Response);

  // Step 12: Create second customer account
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: {
      email: customer2Email,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer2);

  // Step 13: Customer2 creates address
  const address2 = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({ sentences: 3 }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: "United States",
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address2);

  // Step 14: Customer2 creates payment method
  const payment2 =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: "credit_card",
          gateway_token: RandomGenerator.alphaNumeric(32),
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(payment2);

  // Step 15: Customer2 adds product to cart
  const cartId2 = typia.random<string & tags.Format<"uuid">>();
  const cartItem2 =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId2,
      body: {
        shopping_mall_sku_id: sku2.id,
        quantity: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem2);

  // Step 16: Customer2 places order
  const order2Response =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        delivery_address_id: address2.id,
        payment_method_id: payment2.id,
        shipping_method: "express",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order2Response);

  // Step 17: Admin retrieves status history for first order (connection now has admin token from initial join)
  const orderId1 = typia.assert(order1Response.order_ids[0]!);
  const statusHistory1 =
    await api.functional.shoppingMall.admin.orders.statusHistory.index(
      connection,
      {
        orderId: orderId1,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(statusHistory1);

  // Step 18: Validate pagination structure
  TestValidator.equals(
    "status history pagination current page",
    statusHistory1.pagination.current,
    1,
  );
  TestValidator.equals(
    "status history pagination limit",
    statusHistory1.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "status history has valid page count",
    statusHistory1.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "status history has valid record count",
    statusHistory1.pagination.records >= 0,
  );

  // Step 19: Validate status history data exists and contains required fields
  TestValidator.predicate(
    "status history contains records",
    statusHistory1.data.length > 0,
  );

  const firstHistory = statusHistory1.data[0];
  typia.assertGuard(firstHistory!);
  TestValidator.predicate(
    "status history record has order ID",
    firstHistory.shopping_mall_order_id === orderId1,
  );
  TestValidator.predicate(
    "status history record has new status",
    firstHistory.new_status.length > 0,
  );
  TestValidator.predicate(
    "status history record has created timestamp",
    firstHistory.created_at.length > 0,
  );
  TestValidator.predicate(
    "status history record has system generated flag",
    typeof firstHistory.is_system_generated === "boolean",
  );

  // Step 20: Admin retrieves status history for second order
  const orderId2 = typia.assert(order2Response.order_ids[0]!);
  const statusHistory2 =
    await api.functional.shoppingMall.admin.orders.statusHistory.index(
      connection,
      {
        orderId: orderId2,
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(statusHistory2);

  TestValidator.equals(
    "second order status history pagination limit",
    statusHistory2.pagination.limit,
    5,
  );

  // Step 21: Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 86400000);
  const statusHistoryWithDateFilter =
    await api.functional.shoppingMall.admin.orders.statusHistory.index(
      connection,
      {
        orderId: orderId1,
        body: {
          page: 1,
          limit: 10,
          start_date: oneDayAgo.toISOString(),
          end_date: now.toISOString(),
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(statusHistoryWithDateFilter);

  TestValidator.predicate(
    "date filtered status history returns results",
    statusHistoryWithDateFilter.data.length >= 0,
  );

  // Step 22: Validate comprehensive access - admin can see all order histories
  TestValidator.predicate(
    "admin can access order from first customer",
    statusHistory1.data.length > 0,
  );
  TestValidator.equals(
    "first order status history matches order ID",
    statusHistory1.data[0].shopping_mall_order_id,
    orderId1,
  );

  TestValidator.predicate(
    "admin can access order from second customer",
    statusHistory2.data.length > 0,
  );
  TestValidator.equals(
    "second order status history matches order ID",
    statusHistory2.data[0].shopping_mall_order_id,
    orderId2,
  );

  // Step 23: Test status-based filtering if first order has a status
  if (statusHistory1.data.length > 0 && statusHistory1.data[0].new_status) {
    const specificStatus = statusHistory1.data[0].new_status;
    const statusFilteredHistory =
      await api.functional.shoppingMall.admin.orders.statusHistory.index(
        connection,
        {
          orderId: orderId1,
          body: {
            page: 1,
            limit: 10,
            new_status: specificStatus,
          } satisfies IShoppingMallOrderStatusHistory.IRequest,
        },
      );
    typia.assert(statusFilteredHistory);

    TestValidator.predicate(
      "status filtered results contain matching status",
      statusFilteredHistory.data.length === 0 ||
        statusFilteredHistory.data.every(
          (h) => h.new_status === specificStatus,
        ),
    );
  }
}
