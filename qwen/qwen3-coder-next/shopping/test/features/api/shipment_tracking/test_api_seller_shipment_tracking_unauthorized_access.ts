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

export async function test_api_seller_shipment_tracking_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A joins and creates shipment
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!@#$",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // Create new connection with token from sellerA
  const sellerATokenConnection: api.IConnection = { host: connection.host };
  sellerATokenConnection.headers = {
    Authorization: sellerA.token.access,
  };
  // Seller A creates a shipment
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerATokenConnection,
    {
      body: typia.random<IShoppingMallShipment.ICreate>(),
    },
  );
  typia.assert(shipment);
  // 2. Seller B joins (different seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!@#$",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // Create new connection with token from sellerB
  const sellerBTokenConnection: api.IConnection = { host: connection.host };
  sellerBTokenConnection.headers = {
    Authorization: sellerB.token.access,
  };
  // 3. Seller B attempts to view Seller A's shipment (should fail with 404)
  await TestValidator.error(
    "seller B cannot view seller A's shipment",
    async () => {
      await api.functional.shoppingMall.seller.shipments.tracking.at(
        sellerBTokenConnection,
        {
          shipmentId: shipment.id,
        },
      );
    },
  );
}