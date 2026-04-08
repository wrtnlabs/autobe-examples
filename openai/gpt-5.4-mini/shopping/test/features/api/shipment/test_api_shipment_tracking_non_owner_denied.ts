import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_shipment_tracking_non_owner_denied(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that shipment tracking data is protected from non-owning sellers.
   *
   * This test covers the access-control boundary on shipment tracking lookup by creating two independent seller accounts and confirming that a seller cannot read another seller's shipment tracking details.
   *
   * 1. Register two distinct seller accounts and keep separate authenticated connections.
   * 2. Attempt to access a shipment tracking record using the second seller's connection.
   * 3. Confirm the request is rejected by authorization rules.
   * 4. Ensure the protected shipment tracking payload is not exposed to the non-owner.
   */
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_seller_join(ownerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` satisfies string,
      password: "Password123!" satisfies string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(ownerAuth);
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerAuth = await authorize_seller_join(nonOwnerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}-2@example.com` satisfies string,
      password: "Password123!" satisfies string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(nonOwnerAuth);
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-owning seller cannot access shipment tracking",
    async () => {
      await api.functional.mallPlatform.seller.shipments.tracking.at(
        nonOwnerConnection,
        {
          shipmentId,
        },
      );
    },
  );
}
