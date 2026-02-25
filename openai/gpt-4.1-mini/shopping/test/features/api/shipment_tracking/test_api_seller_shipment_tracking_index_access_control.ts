import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentTracking";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
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

export async function test_api_seller_shipment_tracking_index_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Verify access control preventing cross-seller data leakage
  // Confirm that a seller cannot retrieve shipment tracking records for shipments created by other sellers.
  // 1. Seller1 join and authenticate
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: `seller1+${Date.now()}@test.com`,
      shopName: "Shop A",
      password: "12345678",
    },
  });
  typia.assert(seller1Auth);
  seller1Connection.headers = {
    Authorization: `Bearer ${seller1Auth.token.access}`,
  };
  // 2. Seller2 join and authenticate
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: `seller2+${Date.now()}@test.com`,
      shopName: "Shop B",
      password: "12345678",
    },
  });
  typia.assert(seller2Auth);
  seller2Connection.headers = {
    Authorization: `Bearer ${seller2Auth.token.access}`,
  };
  // 3. Seller1 create a shipment
  const shipment1 = await generate_random_shopping_mall_seller_shipments_create(
    seller1Connection,
    { body: {} },
  );
  typia.assert(shipment1);
  // 4. Seller2 create a shipment
  const shipment2 = await generate_random_shopping_mall_seller_shipments_create(
    seller2Connection,
    { body: {} },
  );
  typia.assert(shipment2);
  // 5. Seller1 attempts to access shipment tracking records for shipment2's id
  const shipmentTrackingRecords =
    await api.functional.shoppingMall.seller.shipmentTrackings.index(
      seller1Connection,
      {
        body: { shipmentId: shipment2.id },
      },
    );
  typia.assert(shipmentTrackingRecords);
  // 6. Validate that no tracking records related to shipment2 are visible to seller1
  TestValidator.equals(
    "cross-seller shipment tracking access",
    shipmentTrackingRecords.data.length,
    0,
  );
}
