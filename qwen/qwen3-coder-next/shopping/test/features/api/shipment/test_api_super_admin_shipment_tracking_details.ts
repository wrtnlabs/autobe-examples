import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_super_admin_shipment_tracking_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: RandomGenerator.alphabets(8) + "@test.com",
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Login as customer
  await authorize_customer_login(customerConnection, {
    body: {
      email: RandomGenerator.alphabets(8) + "@test.com",
      password: "1234",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Place order to create shipment
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        shipping_address: {
          recipient: RandomGenerator.name(),
          address: RandomGenerator.alphabets(10),
          city: RandomGenerator.name(1),
          state: RandomGenerator.alphabets(2),
          zip_code: RandomGenerator.alphaNumeric(5),
          country: "US",
        },
        items: [
          {
            product_id: RandomGenerator.alphaNumeric(8),
            variant_id: RandomGenerator.alphaNumeric(8),
            quantity: 1,
            price: 100,
          },
        ],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 4. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.super_admin.join(
    superAdminConnection,
    {
      body: {
        email: "superadmin@test.com",
        password: "1234",
        name: "Super Admin",
      } satisfies IShoppingMallSuperAdmin.IJoin,
    },
  );
  // 5. Login as super admin
  await api.functional.shoppingMall.auth.super_admin.login(
    superAdminConnection,
    {
      body: {
        email: "superadmin@test.com",
        password: "1234",
      } satisfies IShoppingMallSuperAdmin.ILogin,
    },
  );
  // 6. Generate a random UUID for shipment ID
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // 7. Retrieve shipment details as super admin
  // IShoppingMallShipment is an empty type with no properties
  const shipment = await api.functional.shoppingMall.superAdmin.shipments.at(
    superAdminConnection,
    {
      shipmentId,
    },
  );
  typia.assert(shipment);
}
