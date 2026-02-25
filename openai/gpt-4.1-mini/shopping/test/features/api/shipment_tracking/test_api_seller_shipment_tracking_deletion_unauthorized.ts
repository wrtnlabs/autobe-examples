import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipment_tracking_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // We attempt to delete a shipment tracking record with an unauthorized connection
  const shipmentTrackingId = typia.random<string & tags.Format<"uuid">>();
  // Attempt deletion without authentication, expect HTTP 401 or 403
  await TestValidator.httpError(
    "unauthorized shipment tracking deletion",
    [401, 403],
    async () => {
      // Use base connection directly without auth
      await api.functional.shoppingMall.seller.shipmentTrackings.erase(
        connection,
        {
          shipmentTrackingId,
        },
      );
    },
  );
}
