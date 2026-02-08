import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_shipment_order_items_access_control_restriction(
  connection: api.IConnection,
): Promise<void> {
  // Validate access control by attempting shipment order items retrieval with a non-administrator role such as customer or seller. Ensure the API denies access with appropriate authorization error. This test reinforces security boundaries of shipment order management by restricting to administrators only.
  // 1. Administrator join and login
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinPayload: IShoppingMallAdministrator.IJoin = {};
  const adminAuthorized = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: adminJoinPayload,
    },
  );
  typia.assert(adminAuthorized);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, { body: {} });
  // 2. Seller join and login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinPayload: IShoppingMallSeller.IJoin = {};
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: sellerJoinPayload,
  });
  typia.assert(sellerAuthorized);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, { body: {} });
  // 3. Customer join and login
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoinPayload: IShoppingMallCustomer.IJoin = {};
  const customerAuthorized = await authorize_customer_join(
    customerJoinConnection,
    {
      body: customerJoinPayload,
    },
  );
  typia.assert(customerAuthorized);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, { body: {} });
  // 4. Seller creates a shipment
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(shipment);
  const shipmentId = (shipment as { id: string }).id;
  // 5. Customer attempts to retrieve shipment order items via administrator endpoint - expect authorization error
  await TestValidator.error(
    "customer access denied on shipment order items",
    async () => {
      await api.functional.shoppingMall.administrator.shipments.order_items.index(
        customerConnection,
        {
          shipmentId: shipmentId,
          body: {},
        },
      );
    },
  );
  // 6. Seller attempts to retrieve shipment order items via administrator endpoint - expect authorization error
  await TestValidator.error(
    "seller access denied on shipment order items",
    async () => {
      await api.functional.shoppingMall.administrator.shipments.order_items.index(
        sellerConnection,
        {
          shipmentId: shipmentId,
          body: {},
        },
      );
    },
  );
  // 7. Optionally, administrator itself can retrieve shipment order items (not part of access control test, so skipped)
}
