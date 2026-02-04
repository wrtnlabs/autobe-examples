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

export async function test_api_admin_order_creation_with_new_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      href: "https://example.com/login",
      referrer: "https://example.com/home",
      ip: "127.0.0.1",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Create a new customer
  const customer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(adminConnection, {
      body: {} satisfies IShoppingMallCustomer.IJoin,
    });
  // 3. Create shipping address for the customer
  const customerAddress: IShoppingMallCustomerAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      adminConnection,
      {
        body: {
          recipient: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({ sentences: 2 }),
          city: "Seoul",
          postal_code: "12345",
          country_code: "KR",
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  // 4. Create order using admin credentials
  const order: IShoppingMallSalesOrder =
    await generate_random_shopping_mall_admin_orders_create(adminConnection, {
      body: {
        customer_id: customer.id,
        shipping_address_id: customerAddress.id,
      } satisfies IShoppingMallSalesOrder.ICreate,
    });
  // 5. Validate that the order is associated with the correct customer and address
  TestValidator.equals("order customer", order.customer.id, customer.id);
  TestValidator.equals("order shipment", order.shipment.id, customerAddress.id);
  // 6. Ensure order is created with correct status for the flow
  TestValidator.equals("order status", order.status, "created");
  // 7. Ensure all required properties are properly populated
  typia.assert(order);
}
