import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Verifies that shipment-item removal is rejected for a completed shipment.
 *
 * This test covers the immutable state of completed shipments and confirms that
 * seller-side shipping mutations are blocked once the shipment has finished.
 * It uses an authenticated seller actor, calls the shipment-item deletion
 * endpoint, and checks that the operation fails instead of allowing further
 * modification.
 *
 * 1. Authenticate as the owning seller with an actor-specific connection.
 * 2. Attempt to remove a shipment item from a completed shipment.
 * 3. Verify the request is rejected by the API.
 */
export async function test_api_shipment_item_remove_from_completed_shipment(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!abcd",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  await TestValidator.error(
    "completed shipment item removal should be rejected",
    async () => {
      await api.functional.mallPlatform.seller.shipments.shipmentItems.erase(
        sellerConnection,
        {
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
          shipmentItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
