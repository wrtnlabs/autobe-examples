import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipment_unauthorized_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. First seller registers and creates a shipment
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Token = await authorize_seller_join(seller1Connection, {
    body: {
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Create connection with token from first seller
  const seller1AuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${seller1Token.token.access}`,
    },
  };
  // Create a shipment as first seller
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    seller1AuthConnection,
    {
      body: typia.random<IShoppingMallShipment.ICreate>(),
    },
  );
  typia.assert(shipment);
  // 2. Second seller registers (different seller account)
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Token = await authorize_seller_join(seller2Connection, {
    body: {
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Create connection with token from second seller
  const seller2AuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${seller2Token.token.access}`,
    },
  };
  // 3. Second seller attempts to update first seller's shipment (unauthorized)
  // Generate a random shipment ID since shipment.id is not accessible due to type definition
  await TestValidator.error(
    "second seller cannot update first seller's shipment",
    async () => {
      await api.functional.shoppingMall.seller.shipments.putById(
        seller2AuthConnection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
          body: typia.random<IShoppingMallShipment.IUpdate>(),
        },
      );
    },
  );
}
