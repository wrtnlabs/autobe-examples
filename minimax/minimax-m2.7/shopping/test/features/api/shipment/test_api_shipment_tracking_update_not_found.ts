import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
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
 * Test that updating a shipment with a non-existent shipment ID returns a 404 Not Found error.
 *
 * This test validates the API's handling of requests to update shipments that don't exist in the system.
 * When a seller attempts to update tracking information for a shipment ID that is not found in the database,
 * the API should return a 404 Not Found error rather than silently failing or returning unexpected data.
 *
 * 1. Register and authenticate as a seller using the authorize_seller_join utility function.
 * 2. Create a new connection with the seller's authentication token.
 * 3. Generate a random UUID that doesn't exist in the system.
 * 4. Attempt to update the shipment with the non-existent shipment ID using the PATCH endpoint.
 * 5. Verify that a 404 Not Found error is returned using TestValidator.httpError.
 *
 * @param connection Base API connection for making requests
 */
export async function test_api_shipment_tracking_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `seller-${RandomGenerator.alphabets(8)}@test.com`,
      password: "Password1234!",
    },
  });
  // 2. Generate a random UUID that doesn't exist in the system
  const nonExistentShipmentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to update shipment with non-existent ID - should return 404
  await TestValidator.httpError(
    "updating non-existent shipment should return 404 Not Found",
    404,
    async () =>
      await api.functional.ecommerceMall.seller.sellers.me.shipments.update(
        sellerConnection,
        {
          shipmentId: nonExistentShipmentId,
          body: {
            carrier: "DHL Express",
            trackingNumber: "1234567890",
          } satisfies IEcommerceMallShipment.IUpdate,
        },
      ),
  );
}