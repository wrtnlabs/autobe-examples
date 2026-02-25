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

export async function test_api_seller_shipment_tracking_index_no_filters(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve shipment tracking list with no filters
  // Step 1: Seller join and authorize
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  // Step 2: Create seller-specific connection with auth token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // Step 3: Generate shipment prerequisite for tracking records
  // Using provided generation function
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(shipment);
  // Step 4: Retrieve shipment tracking list with no filters
  const trackingList =
    await api.functional.shoppingMall.seller.shipmentTrackings.index(
      sellerConnection,
      { body: {} },
    );
  typia.assert(trackingList);
  // Step 5: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be >= 1",
    trackingList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be > 0",
    trackingList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    trackingList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    trackingList.pagination.pages >= 0,
  );
  // Step 6: Confirm all shipment tracking belong to the authenticated seller
  for (const tracking of trackingList.data) {
    typia.assert(tracking);
    // The seller id must match the current authorized seller id
    TestValidator.equals(
      "tracking shipment seller id",
      tracking.shipment.seller.id,
      sellerAuthorized.id,
    );
  }
}
