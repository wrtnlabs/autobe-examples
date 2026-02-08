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
import { generate_random_shopping_mall_customer_shipment_confirmations_create } from "../../../generate/generate_random_shopping_mall_customer_shipment_confirmations_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_customer_shipment_confirmation_update_past_timestamp(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join and authenticate
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoinOutput = await authorize_customer_join(
    customerJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(customerJoinOutput);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {},
  });
  // 2. Seller join and authenticate
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinOutput = await authorize_seller_join(sellerJoinConnection, {
    body: {},
  });
  typia.assert(sellerJoinOutput);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {},
  });
  // 3. Seller creates a shipment
  const shipmentResponse = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(shipmentResponse);
  // Extract shipment id properly
  // Assuming shipmentResponse has 'shipment' property or is IShoppingMallShipment directly
  const shipmentId = (shipmentResponse as IShoppingMallShipment & { id?: string }).id;
  if (!shipmentId) throw new Error("Shipment id not found");
  // 4. Customer creates a shipment confirmation
  const shipmentConfirmationResponse =
    await generate_random_shopping_mall_customer_shipment_confirmations_create(
      customerConnection,
      {
        body: {
          shipment_id: shipmentId,
          confirmed_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(shipmentConfirmationResponse);
  // Extract confirmation id
  const confirmationId = (shipmentConfirmationResponse as IShoppingMallShipmentConfirmation & { id?: string }).id;
  if (!confirmationId) throw new Error("Shipment confirmation id not found");
  // 5. Customer updates the confirmation with a past timestamp
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const updateBody: IShoppingMallShipmentConfirmation.IUpdate = {
    confirmed_at: pastDate,
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  const updatedConfirmation =
    await api.functional.shoppingMall.customer.shipment_confirmations.update(
      customerConnection,
      {
        confirmationId: confirmationId,
        body: updateBody,
      },
    );
  typia.assert(updatedConfirmation);
  // 6. Assert the response returns the updated timestamp
  // We have to check if updatedConfirmation has confirmed_at property
  // If not, skip this or use type assertion
  if (!("confirmed_at" in updatedConfirmation))
    throw new Error("Property 'confirmed_at' does not exist on updated confirmation");
  TestValidator.equals(
    "updated confirmed_at",
    updatedConfirmation.confirmed_at,
    pastDate,
  );
  // 7. Assert audit timestamps update accordingly
  // Safely check updated_at and shipmentConfirmation
  const originalUpdatedAt =
    (shipmentConfirmationResponse as any).updated_at ?? null;
  const newUpdatedAt = (updatedConfirmation as any).updated_at ?? null;
  TestValidator.notEquals("updated_at differs", originalUpdatedAt, newUpdatedAt);
  // 8. Verify only authorized users can perform the update
  // Attempt update with a different customer (unauthorized)
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherCustomerJoinOutput = await authorize_customer_join(
    otherCustomerConnection,
    {
      body: {},
    },
  );
  typia.assert(otherCustomerJoinOutput);
  await TestValidator.error("unauthorized update attempt", async () => {
    await api.functional.shoppingMall.customer.shipment_confirmations.update(
      otherCustomerConnection,
      {
        confirmationId: confirmationId,
        body: updateBody,
      },
    );
  });
}
