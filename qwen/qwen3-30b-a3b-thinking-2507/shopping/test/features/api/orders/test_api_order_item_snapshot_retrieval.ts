import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSalesOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOrder";
import type { IShoppingMallSalesOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOrderItem";
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
import { generate_random_shopping_mall_admin_orders_create } from "../../../generate/generate_random_shopping_mall_admin_orders_create";
import { generate_random_shopping_mall_admin_orders_items_create } from "../../../generate/generate_random_shopping_mall_admin_orders_items_create";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_sales_order } from "../../../prepare/prepare_random_shopping_mall_sales_order";
import { prepare_random_shopping_mall_sales_order_item } from "../../../prepare/prepare_random_shopping_mall_sales_order_item";

export async function test_api_order_item_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {}, // Admin join data is empty
  });
  // Step 2: Login as admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: "admin@example.com",
      password: "admin123",
      href: "http://localhost",
      referrer: "http://localhost",
    },
  });
  // Step 3: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@example.com",
      password: "customer123",
      href: "http://localhost",
      referrer: "http://localhost",
    },
  });
  // Step 4: Login as customer
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: "customer@example.com",
      password: "customer123",
      href: "http://localhost",
      referrer: "http://localhost",
    },
  });
  // Step 5: Create shipping address for customer
  const shippingAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerLoginConnection,
      {
        body: {
          recipient: "John Doe",
          phone: "01012345678",
          street: "123 Main Street",
          city: "Seoul",
          postal_code: "06000",
          country_code: "KR",
          is_default: true,
        },
      },
    );
  // Step 6: Create an order
  const order = await generate_random_shopping_mall_admin_orders_create(
    adminLoginConnection,
    {
      body: {
        customer_id: customer.id,
        shipping_address_id: shippingAddress.id,
      },
    },
  );
  // Step 7: Add item to order
  const orderItem =
    await generate_random_shopping_mall_admin_orders_items_create(
      adminLoginConnection,
      {
        params: {
          orderId: order.id,
        },
        body: {
          // Order item creation data
        },
      },
    );
  // Step 8: Retrieve snapshots for order item
  const snapshots =
    await api.functional.shoppingMall.admin.orders.order_items.snapshots.index(
      adminLoginConnection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  // Step 9: Validate snapshots
  typia.assert(snapshots);
  TestValidator.equals(
    "snapshots data exists",
    snapshots.data.length > 0,
    true,
  );
  if (snapshots.data.length > 0) {
    TestValidator.equals(
      "snapshot ID matches order item",
      snapshots.data[0].order_item.id,
      orderItem.id,
    );
    TestValidator.equals(
      "snapshot action is correct",
      snapshots.data[0].action,
      "add",
    );
  }
}
