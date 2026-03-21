import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller retrieving a non-existent shipment item.
 *
 * This test validates that when a seller attempts to retrieve a shipment item
 * with non-existent shipmentId and itemId, the API returns a 404 Not Found response.
 *
 * **Setup Steps:**
 * 1. Register a seller account via POST /ecommerceMall/auth/seller/join
 * 2. Generate UUIDs for non-existent shipmentId and itemId
 *
 * **Test Execution:**
 * - Call GET /ecommerceMall/seller/shipments/{nonExistentShipmentId}/items/{nonExistentItemId}
 *
 * **Expected Validations:**
 * - Response status: 404 Not Found
 * - Response body indicates shipment item was not found
 * - Error message should indicate the resource does not exist
 */
export async function test_api_seller_shipment_item_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Generate non-existent UUIDs for shipment and item IDs
  const nonExistentShipmentId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the non-existent shipment item
  // Expected: 404 Not Found error
  await TestValidator.httpError(
    "non-existent shipment item returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.seller.shipments.items.at(
        sellerConnection,
        {
          shipmentId: nonExistentShipmentId,
          itemId: nonExistentItemId,
        },
      ),
  );
}
