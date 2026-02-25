import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
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

export async function test_api_seller_shipment_tracking_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller login connection using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url:
        Math.random() > 0.5
          ? null
          : typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Create shipment with tracking information
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        order_id: typia.random<string & tags.Format<"uuid">>(),
        tracking_number: RandomGenerator.alphaNumeric(12),
        tracking_carrier: RandomGenerator.pick([
          "Korea Express",
          "CJ Logistics",
          "Hanjin",
          "DHL",
          "FedEx",
        ]),
        items: [
          {
            item_ids: [typia.random<string & tags.Format<"uuid">>()],
          } satisfies IShoppingMallShipment.ICreateItem,
        ],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 3. Retrieve tracking information
  const tracking =
    await api.functional.shoppingMall.seller.shipments.tracking.at(
      sellerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(tracking);
  // 4. Validate tracking information
  TestValidator.equals(
    "tracking number matches",
    tracking.trackingNumber,
    shipment.trackingNumber,
  );
  TestValidator.equals(
    "carrier matches",
    tracking.trackingCarrier,
    shipment.trackingCarrier,
  );
  TestValidator.equals("status is shipped", tracking.status, "shipped");
  TestValidator.predicate("shipped_at exists", tracking.shippedAt !== null);
}
