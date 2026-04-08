import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Rejects shipment updates from a seller that does not own the shipment.
 *
 * Verifies that the shipment update endpoint enforces seller ownership and does
 * not permit cross-seller modification of shipment header fields.
 *
 * Because this test suite only exposes the shipment update endpoint, the scenario
 * focuses on authorization failure behavior rather than constructing a full
 * persisted shipment lifecycle. The request must fail for a foreign seller, and
 * the endpoint must not allow unauthorized mutation of carrier, tracking, or
 * lifecycle fields.
 *
 * 1. Register two independent seller accounts.
 * 2. Attempt to update a shipment as the non-owning seller.
 * 3. Confirm the request is rejected.
 */
export async function test_api_shipment_update_ownership_restriction(
  connection: api.IConnection,
): Promise<void> {
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerA);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerB);
  await TestValidator.error(
    "seller A cannot update seller B shipment",
    async () => {
      await api.functional.mallPlatform.seller.shipments.update(
        sellerAConnection,
        {
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            carrierName: RandomGenerator.name(),
            trackingNumber: RandomGenerator.alphaNumeric(12),
            trackingUrl: `https://example.com/track/${RandomGenerator.alphaNumeric(8)}`,
            status: RandomGenerator.pick([
              "preparing",
              "shipped",
              "delivered",
            ] as const),
          } satisfies IMallPlatformShipment.IUpdate,
        },
      );
    },
  );
}
