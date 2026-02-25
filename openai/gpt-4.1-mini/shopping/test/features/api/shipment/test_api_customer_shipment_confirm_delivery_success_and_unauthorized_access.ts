import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
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
import { generate_random_shopping_mall_customer_shipments_confirm_delivery_confirm_delivery } from "../../../generate/generate_random_shopping_mall_customer_shipments_confirm_delivery_confirm_delivery";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_customer_shipment_confirm_delivery_success_and_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario implementation for shipment delivery confirmation
  // Create new customer A and authenticate
  const customerAJoinConnection: api.IConnection = { host: connection.host };
  const customerAAuthorized = await authorize_customer_join(
    customerAJoinConnection,
    { body: {} },
  );
  typia.assert(customerAAuthorized);
  // Initialize customer A connection with authorization
  const customerAConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerAAuthorized.token.access },
  };
  // Create new seller, authenticate
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(
    sellerJoinConnection,
    { body: {} },
  );
  typia.assert(sellerAuthorized);
  // Initialize seller connection
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerAuthorized.token.access },
  };
  // Seller creates shipment including order items
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);
  TestValidator.predicate(
    "shipment status is shipped",
    shipment.status === "shipped",
  );
  // Create new customer B and authenticate
  const customerBJoinConnection: api.IConnection = { host: connection.host };
  const customerBAuthorized = await authorize_customer_join(
    customerBJoinConnection,
    { body: {} },
  );
  typia.assert(customerBAuthorized);
  // Initialize customer B connection
  const customerBConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerBAuthorized.token.access },
  };
  // Customer A confirms delivery (authorized customer)
  const confirmedDelivery =
    await generate_random_shopping_mall_customer_shipments_confirm_delivery_confirm_delivery(
      customerAConnection,
      { body: { shoppingMallShipmentId: shipment.id } },
    );
  typia.assert(confirmedDelivery);
  TestValidator.predicate(
    "confirmedAt timestamp present",
    typeof confirmedDelivery.confirmedAt === "string" &&
      confirmedDelivery.confirmedAt.length > 0,
  );
  TestValidator.equals(
    "confirmed delivery shipment id matches",
    confirmedDelivery.shoppingMallShipmentId,
    shipment.id,
  );
  TestValidator.equals(
    "shipment status updated to delivered",
    confirmedDelivery.shipment.status,
    "delivered",
  );
  // Unauthorized access test: Customer B tries to confirm delivery of Customer A's shipment
  await TestValidator.error(
    "unauthorized shipment delivery confirmation",
    async () => {
      await generate_random_shopping_mall_customer_shipments_confirm_delivery_confirm_delivery(
        customerBConnection,
        { body: { shoppingMallShipmentId: shipment.id } },
      );
    },
  );
}
