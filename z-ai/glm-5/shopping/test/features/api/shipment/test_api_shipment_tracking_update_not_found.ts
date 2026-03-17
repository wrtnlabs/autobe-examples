import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

/**
 * Test shipment update with non-existent shipment ID.
 *
 * Validates that when a seller attempts to update a shipment using
 * a non-existent UUID as the shipmentId, the system returns 404 Not Found.
 * This ensures proper error handling and prevents information leakage.
 */
export async function test_api_shipment_tracking_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Generate a non-existent shipment UUID
  const nonExistentShipmentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare valid update request body
  const updateBody = {
    carrier_name: RandomGenerator.name(1),
    tracking_number: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallShipment.IUpdate;
  // 4. Attempt to update non-existent shipment and expect 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent shipment",
    404,
    async () =>
      await api.functional.shoppingMall.seller.shipments.update(
        sellerConnection,
        {
          shipmentId: nonExistentShipmentId,
          body: updateBody,
        },
      ),
  );
}
