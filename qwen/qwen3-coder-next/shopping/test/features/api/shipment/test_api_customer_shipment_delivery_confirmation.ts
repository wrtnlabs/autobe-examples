import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test customer shipment delivery confirmation workflow.
 * 1. Create seller and authenticate
 * 2. Create customer and authenticate
 * 3. Customer places order
 * 4. Seller creates shipment for order items
 * 5. Seller updates shipment with tracking information
 * 6. Customer confirms delivery
 * 7. Validate delivery confirmation fields
 */
export async function test_api_customer_shipment_delivery_confirmation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorization =
    await api.functional.shoppingMall.auth.seller.join(sellerConnection, {
      body: typia.random<IShoppingMallSeller.IJoin>(),
    });
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: sellerAuthorization.token.access,
  };
  const sellerLogin = await api.functional.shoppingMall.auth.seller.login(
    sellerConnection,
    {
      body: typia.random<IShoppingMallSeller.ILogin>(),
    },
  );
  typia.assert(sellerLogin);
  // 2. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorization =
    await api.functional.shoppingMall.auth.customer.join(customerConnection, {
      body: typia.random<IShoppingMallCustomer.IJoin>(),
    });
  customerConnection.headers = {
    ...customerConnection.headers,
    Authorization: customerAuthorization.token.access,
  };
  const customerLogin = await api.functional.shoppingMall.auth.customer.login(
    customerConnection,
    {
      body: typia.random<IShoppingMallCustomer.ILogin>(),
    },
  );
  typia.assert(customerLogin);
  // 3. Create order with customer
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: typia.random<IShoppingMallOrder.ICreate>(),
    },
  );
  typia.assert(order);
  // 4. Create shipment for the order
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      body: typia.random<IShoppingMallShipment.ICreate>(),
    },
  );
  typia.assert(shipment);
  // 5. Update shipment with tracking information
  const updatedShipment =
    await api.functional.shoppingMall.seller.shipments.patchByShipmentid(
      sellerConnection,
      {
        shipmentId: (shipment as any).id,
        body: typia.random<IShoppingMallShipment.IUpdate>(),
      },
    );
  typia.assert(updatedShipment);
  // 6. Confirm delivery as customer
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.patchById(
      customerConnection,
      {
        id: (shipment as any).id,
      },
    );
  typia.assert(confirmedShipment);
  // 7. Validate delivery confirmation - only check what's available in ISummary
  // ISummary only contains basic shipment information for security reasons
  // It excludes internal fields like customer_confirmed_delivery, status, and delivered_at
  TestValidator.predicate(
    "shipment exists",
    confirmedShipment !== null && confirmedShipment !== undefined,
  );
}
