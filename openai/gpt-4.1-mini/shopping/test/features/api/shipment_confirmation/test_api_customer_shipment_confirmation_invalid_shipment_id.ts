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
import { generate_random_shopping_mall_customer_shipment_confirmations_create_shipment_confirmation } from "../../../generate/generate_random_shopping_mall_customer_shipment_confirmations_create_shipment_confirmation";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_customer_shipment_confirmation_invalid_shipment_id(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that the customer cannot confirm delivery with an invalid shipment ID.
  // 1. Customer join and get customer connection with authentication
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(
    customerJoinConnection,
    {},
  );
  typia.assert(customerAuthorized);
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: customerAuthorized.token.access,
  };
  // 2. Seller join and get seller connection with authentication
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(
    sellerJoinConnection,
    { body: {} },
  );
  typia.assert(sellerAuthorized);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // 3. Seller creates a shipment to simulate shipment existence context
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);
  // 4. Customer tries to confirm shipment with an invalid shipment ID
  const invalidShipmentId = typia.random<string & tags.Format<"uuid">>();
  // Ensure invalidShipmentId differs from real shipment id
  if (invalidShipmentId === shipment.id) {
    throw new Error("Random invalid shipment ID matched existing shipment ID");
  }
  // 5. Attempt shipment confirmation with invalid shipment ID and expect failure
  await TestValidator.error(
    "confirm shipment with invalid shipment ID",
    async () => {
      await api.functional.shoppingMall.customer.shipmentConfirmations.createShipmentConfirmation(
        customerConnection,
        {
          body: {
            shoppingMallShipmentId: invalidShipmentId,
            confirmedAt: new Date().toISOString(),
          } satisfies IShoppingMallShipmentConfirmation.ICreate,
        },
      );
    },
  );
}
