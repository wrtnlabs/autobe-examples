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

export async function test_api_seller_shipment_tracking_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create pending shipment using seller endpoint
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);
  // 3. Update shipment with tracking information
  const trackingUpdate: IShoppingMallShipment.IUpdate = {
    carrier_name: RandomGenerator.name(2),
    tracking_number: `TRK-${RandomGenerator.alphaNumeric(12)}`,
  };
  const updatedShipment =
    await api.functional.shoppingMall.seller.shipments.putById(
      sellerConnection,
      {
        id: "",
        body: trackingUpdate,
      },
    );
  typia.assert(updatedShipment);
  // 4. Test status progression to delivered
  const deliveryUpdate: IShoppingMallShipment.IUpdate = {};
  const deliveredShipment =
    await api.functional.shoppingMall.seller.shipments.putById(
      sellerConnection,
      {
        id: "",
        body: deliveryUpdate,
      },
    );
  typia.assert(deliveredShipment);
}
