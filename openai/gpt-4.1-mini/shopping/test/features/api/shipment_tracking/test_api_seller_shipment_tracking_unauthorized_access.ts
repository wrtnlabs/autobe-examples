import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Test unauthorized access to the shipment tracking retrieval endpoint.
 *
 * Steps:
 * 1. Attempt to access a random shipmentTrackingId without any authentication.
 * 2. Validate that the call is rejected with HTTP 401 Unauthorized or 403 Forbidden.
 */
export async function test_api_seller_shipment_tracking_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Base connection used directly without authentication headers
  const shipmentTrackingId = typia.random<
    string & import("typia").tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "unauthorized access to seller shipment tracking",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.seller.shipmentTrackings.at(
        connection,
        {
          shipmentTrackingId,
        },
      );
    },
  );
}
