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

export async function test_api_super_admin_retrieves_shipment_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized =
    await api.functional.shoppingMall.auth.customer.join(customerConnection, {
      body: typia.random<IShoppingMallCustomer.IJoin>(),
    });
  typia.assert(customerAuthorized);
  // Update connection with token
  customerConnection.headers = {
    Authorization: customerAuthorized.token.access,
  };
  // 2. Login as customer to establish session
  await api.functional.shoppingMall.auth.customer.login(customerConnection, {
    body: typia.random<IShoppingMallCustomer.ILogin>(),
  });
  // 3. Create order as customer
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: typia.random<IShoppingMallOrder.ICreate>(),
    },
  );
  typia.assert(order);
  // 4. Create and login as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized =
    await api.functional.shoppingMall.auth.super_admin.join(
      superAdminConnection,
      {
        body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
      },
    );
  typia.assert(superAdminAuthorized);
  // Update connection with token
  superAdminConnection.headers = {
    Authorization: superAdminAuthorized.token.access,
  };
  // 5. Login as super admin
  await api.functional.shoppingMall.auth.super_admin.login(
    superAdminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.ILogin>(),
    },
  );
  // 6. Retrieve shipment details as super admin
  const shipment = await api.functional.shoppingMall.superAdmin.shipments.at(
    superAdminConnection,
    {
      shipmentId: "",
    },
  );
  typia.assert(shipment);
}