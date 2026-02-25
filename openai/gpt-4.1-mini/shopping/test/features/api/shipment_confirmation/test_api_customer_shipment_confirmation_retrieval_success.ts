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

export async function test_api_customer_shipment_confirmation_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = `Bearer ${sellerAuthorized.token.access}`;
  // 2. Customer join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = `Bearer ${customerAuthorized.token.access}`;
  // 3. Another customer for negative test unauthorized
  const anotherCustomerConnection: api.IConnection = { host: connection.host };
  const anotherCustomerAuthorized = await authorize_customer_join(
    anotherCustomerConnection,
    {
      body: {},
    },
  );
  anotherCustomerConnection.headers ??= {};
  anotherCustomerConnection.headers.Authorization = `Bearer ${anotherCustomerAuthorized.token.access}`;
  // 4. Seller creates shipment
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(shipment);
  // 5. Use shipment.id as shipmentConfirmationId (limited by available API)
  const shipmentConfirmationId = shipment.id;
  // 6. Retrieve shipment confirmation by owner customer
  const confirmation =
    await api.functional.shoppingMall.customer.shipmentConfirmations.at(
      customerConnection,
      {
        shipmentConfirmationId,
      },
    );
  typia.assert(confirmation);
  // 7. Validate shipment id match
  TestValidator.equals(
    "shipmentConfirmation.shipment.id",
    confirmation.shipment.id,
    shipment.id,
  );
  // 8. Validate timestamps
  TestValidator.predicate(
    "shipmentConfirmation.confirmedAt exists",
    typeof confirmation.confirmedAt === "string" &&
      confirmation.confirmedAt.length > 0,
  );
  TestValidator.predicate(
    "shipmentConfirmation.createdAt exists",
    typeof confirmation.createdAt === "string" &&
      confirmation.createdAt.length > 0,
  );
  TestValidator.predicate(
    "shipmentConfirmation.updatedAt exists",
    typeof confirmation.updatedAt === "string" &&
      confirmation.updatedAt.length > 0,
  );
  // 9. unauthorized customer cannot access
  await TestValidator.error("unauthorized access rejected", async () => {
    await api.functional.shoppingMall.customer.shipmentConfirmations.at(
      anotherCustomerConnection,
      {
        shipmentConfirmationId,
      },
    );
  });
}
