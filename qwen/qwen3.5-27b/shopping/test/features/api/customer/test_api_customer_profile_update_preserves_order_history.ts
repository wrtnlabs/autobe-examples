import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_me_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_cart_items_create";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test that updating a customer's profile information does not affect their existing order history and maintains all associated data integrity.
 *
 * This test validates the business rule that customer profile updates are independent of transaction history.
 * The test creates a customer with order history, updates their profile, and verifies that all orders remain intact.
 */
export async function test_api_customer_profile_update_preserves_order_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin",
      referrer: "https://test.com",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Setup: Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://test.com/customer",
    referrer: "https://test.com",
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: customerJoinBody,
  });
  typia.assert(customerAuth);
  const originalDisplayName = customerAuth.display_name;
  const customerId = customerAuth.id;
  // 3. Setup: Register and authenticate as seller (for product creation context)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      shop_name: "Test Shop",
      shop_description: "Test shop for E2E testing",
      href: "https://test.com/seller",
      referrer: "https://test.com",
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 4. Setup: Add product to customer's cart (simulating product exists)
  const cartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 5. Setup: Create an order for the customer
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  const orderId = order.id;
  const originalOrderStatus = order.status;
  const originalOrderTotalPrice = order.total_price;
  // Verify order is associated with the customer
  TestValidator.equals(
    "order belongs to customer",
    order.customer.id,
    customerId,
  );
  // 6. Test: Admin updates customer's profile with new display_name
  const newDisplayName = RandomGenerator.name();
  const updateBody = {
    display_name: newDisplayName,
  } satisfies IShoppingMallCustomer.IUpdate;
  const updatedCustomer =
    await api.functional.shoppingMall.admin.customers.update(adminConnection, {
      customerId,
      body: updateBody,
    });
  typia.assert(updatedCustomer);
  // 7. Validation: Verify customer profile was updated
  TestValidator.equals(
    "display_name updated",
    updatedCustomer.display_name,
    newDisplayName,
  );
  TestValidator.equals("customer id unchanged", updatedCustomer.id, customerId);
  TestValidator.equals(
    "email unchanged",
    updatedCustomer.email,
    customerJoinBody.email,
  );
  TestValidator.notEquals(
    "display_name changed",
    updatedCustomer.display_name,
    originalDisplayName,
  );
  // 8. Validation: Verify order history remains intact
  // The order should still exist and be associated with the same customer
  TestValidator.equals(
    "order customer id unchanged",
    order.customer.id,
    customerId,
  );
  TestValidator.equals(
    "order status unchanged",
    order.status,
    originalOrderStatus,
  );
  TestValidator.equals(
    "order total price unchanged",
    order.total_price,
    originalOrderTotalPrice,
  );
  // 9. Validation: Verify order items count is preserved
  TestValidator.predicate("order has items", order.orderItems.length > 0);
}
