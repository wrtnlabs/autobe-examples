import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentTrackingHistoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentTrackingHistoryLog";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentTrackingHistoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingHistoryLog";
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

export async function test_api_seller_shipment_tracking_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Create new connection with authentication token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // 3. Create shipment with tracking information
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    authenticatedSellerConnection,
    {
      body: typia.random<IShoppingMallShipment.ICreate>(),
    },
  );
  typia.assert(shipment);
  // 4. Retrieve tracking history for the shipment
  const trackingHistory =
    await api.functional.shoppingMall.seller.shipments.tracking_history.index(
      authenticatedSellerConnection,
      {
        body: typia.random<IShoppingMallShipmentTrackingHistoryLog.IRequest>(),
      },
    );
  typia.assert(trackingHistory);
  // 5. Validate response structure
  TestValidator.predicate(
    "has pagination info",
    () => trackingHistory.pagination !== undefined,
  );
  TestValidator.predicate("has data array", () =>
    Array.isArray(trackingHistory.data),
  );
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    () => trackingHistory.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    () => trackingHistory.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    () => trackingHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    () => trackingHistory.pagination.pages >= 0,
  );
  // 7. Validate data array items (if any exist)
  if (trackingHistory.data.length > 0) {
    TestValidator.predicate(
      "has at least one tracking log",
      () => trackingHistory.data.length > 0,
    );
  }
}
