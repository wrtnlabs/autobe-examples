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

export async function test_api_customer_shipment_confirmation_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and authenticates
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerJoinConnection, {
    body: {},
  });
  typia.assert(customerAuth);
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 2. Seller joins and authenticates
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {},
  });
  typia.assert(sellerAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 3. Seller creates a shipment
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);
  // 4. Customer creates a shipment confirmation for the shipment
  const shipmentConfirmation =
    await generate_random_shopping_mall_customer_shipment_confirmations_create(
      customerConnection,
      {
        body: {
          shipment_id: (shipment as any).id,
          confirmed_at: new Date().toISOString(),
        } satisfies IShoppingMallShipmentConfirmation.ICreate,
      },
    );
  typia.assert(shipmentConfirmation);
  // 5. Update the shipment confirmation's confirmed_at timestamp with a new current timestamp
  const newConfirmedAt = new Date(Date.now() + 1000).toISOString();
  const updatedConfirmation =
    await api.functional.shoppingMall.customer.shipment_confirmations.update(
      customerConnection,
      {
        confirmationId: (shipmentConfirmation as any).id,
        body: {
          confirmed_at: newConfirmedAt,
          updated_at: new Date().toISOString(),
          deleted_at: null,
        } satisfies IShoppingMallShipmentConfirmation.IUpdate,
      },
    );
  typia.assert(updatedConfirmation);
  // 6. Validate that the updated confirmed_at timestamp matches the new one
  TestValidator.equals(
    "confirmed_at timestamp",
    (updatedConfirmation as any).confirmed_at,
    newConfirmedAt,
  );
  // 7. Validate updated_at is defined and is more recent than the creation time
  TestValidator.predicate(
    "updated_at timestamp is more recent",
    Date.parse((updatedConfirmation as any).updated_at) >
      Date.parse((shipmentConfirmation as any).updated_at),
  );
  // 8. Validate deleted_at is null
  TestValidator.equals(
    "deleted_at is null",
    (updatedConfirmation as any).deleted_at,
    null,
  );
  // 9. Authorization test: another customer cannot update this confirmation
  const anotherCustomerJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const anotherCustomerAuth = await authorize_customer_join(
    anotherCustomerJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(anotherCustomerAuth);
  const anotherCustomerConnection: api.IConnection = { host: connection.host };
  anotherCustomerConnection.headers = {
    Authorization: anotherCustomerAuth.token.access,
  };
  await TestValidator.error(
    "unauthorized update by other customer",
    async () => {
      await api.functional.shoppingMall.customer.shipment_confirmations.update(
        anotherCustomerConnection,
        {
          confirmationId: (shipmentConfirmation as any).id,
          body: {
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          } satisfies IShoppingMallShipmentConfirmation.IUpdate,
        },
      );
    },
  );
}
