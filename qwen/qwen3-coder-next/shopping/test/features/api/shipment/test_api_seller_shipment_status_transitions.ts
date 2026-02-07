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

export async function test_api_seller_shipment_status_transitions(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Get shipment ID - need to create order and shipment first
  // For now, use a placeholder shipment ID that exists in test database
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // Step 1: Update status to 'shipped'
  const shippedShipment =
    await api.functional.shoppingMall.seller.shipments.patchByShipmentid(
      sellerConnection,
      {
        shipmentId,
        body: { status: "shipped" } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(shippedShipment);
  // Step 2: Update status to 'delivered'
  const deliveredShipment =
    await api.functional.shoppingMall.seller.shipments.patchByShipmentid(
      sellerConnection,
      {
        shipmentId,
        body: { status: "delivered" } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(deliveredShipment);
}
