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

export async function test_api_customer_shipment_confirmation_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description:
  // Prevent duplicate shipment confirmation by the same customer for the same shipment.
  // 1. Seller join and login with known credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: sellerPassword,
    shopName: RandomGenerator.name(1),
    shopDescription: null,
    logoUri: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: sellerJoinInput,
  });
  typia.assert(sellerJoin);
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinInput.email,
      password: sellerPassword,
    },
  });
  typia.assert(sellerLogin);
  // 2. Generate a shipment by the seller
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);
  // 3. Customer join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: customerPassword,
  } satisfies IShoppingMallCustomer.IJoin;
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: customerJoinInput,
  });
  typia.assert(customerJoin);
  const customerLogin = await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoinInput.email,
      password: customerPassword,
    },
  });
  typia.assert(customerLogin);
  // 4. Customer creates first shipment confirmation for the shipment
  const firstConfirmation =
    await generate_random_shopping_mall_customer_shipment_confirmations_create_shipment_confirmation(
      customerConnection,
      {
        body: {
          shoppingMallShipmentId: shipment.id,
        },
      },
    );
  typia.assert(firstConfirmation);
  TestValidator.equals(
    "shipment ID matches",
    firstConfirmation.shoppingMallShipmentId,
    shipment.id,
  );
  // 5. Attempt to create duplicate shipment confirmation for the same shipment
  await TestValidator.error(
    "duplicate shipment confirmation prevented",
    async () => {
      await generate_random_shopping_mall_customer_shipment_confirmations_create_shipment_confirmation(
        customerConnection,
        {
          body: {
            shoppingMallShipmentId: shipment.id,
          },
        },
      );
    },
  );
}
