import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_sales_order } from "../../../prepare/prepare_random_shopping_mall_sales_order";

export async function test_api_order_shipment_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, { body: {} });
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 3. Create shipping address for customer
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  // 4. Create order with shipping address reference
  const order = await generate_random_shopping_mall_admin_orders_create(
    adminConnection,
    {
      body: {
        customer_id: customer.id,
        shipping_address_id: address.id,
      },
    },
  );
  // 5. Update shipment
  const updatedShipment =
    await api.functional.shoppingMall.admin.orders.shipments.patchByOrderid(
      adminConnection,
      {
        orderId: order.id,
        body: {
          carrier: "DHL",
          trackingNumber: "1234567890",
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  // 6. Verify shipment status, carrier and tracking number
  typia.assert(updatedShipment);
  TestValidator.equals(
    "shipment status should be shipped",
    updatedShipment.status,
    "shipped",
  );
  TestValidator.equals(
    "shipment carrier should be DHL",
    updatedShipment.carrier,
    "DHL",
  );
  TestValidator.equals(
    "shipment tracking number should be 1234567890",
    updatedShipment.trackingNumber,
    "1234567890",
  );
  // 7. Verify associated order items are shipped
  for (const item of order.orderItems) {
    TestValidator.equals(
      "order item status should be shipped",
      item.status,
      "shipped",
    );
  }
}
