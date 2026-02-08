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
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_customer_shipment_confirm_delivery_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Unauthorized attempt to confirm shipment delivery by a customer not associated with the shipment.
  // 1. Authenticate a new customer (unauthorized user for the shipment)
  const unauthorizedCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedCustomerJoinOutput = await authorize_customer_join(
    unauthorizedCustomerConnection,
    {
      body: {
        email: `unauth_customer_${RandomGenerator.alphaNumeric(5)}@test.com`,
        password: "password123",
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(unauthorizedCustomerJoinOutput);
  unauthorizedCustomerConnection.headers = {
    Authorization: unauthorizedCustomerJoinOutput.token.access,
  };
  // 2. Authenticate seller and create a shipment
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinOutput = await authorize_seller_join(sellerConnection, {
    body: {
      email: `seller_${RandomGenerator.alphaNumeric(5)}@test.com`,
      password: "password123",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinOutput);
  sellerConnection.headers = {
    Authorization: sellerJoinOutput.token.access,
  };
  // Create shipment for seller
  await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: undefined,
    },
  );
  // 3. Unauthorized customer tries to confirm delivery of the shipment using random shipmentId
  const randomShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "forbidden when unauthorized customer confirms delivery",
    403,
    async () => {
      await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
        unauthorizedCustomerConnection,
        { shipmentId: randomShipmentId },
      );
    },
  );
}
