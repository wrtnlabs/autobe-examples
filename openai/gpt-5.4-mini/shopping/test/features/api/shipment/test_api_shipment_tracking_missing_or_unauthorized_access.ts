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
 * Verify shipment tracking access fails for missing and unauthorized shipment lookups.
 *
 * This test validates the seller shipment tracking endpoint against two denial
 * conditions: a nonexistent shipment identifier and an access attempt that must
 * not reveal tracking details to an unauthorized seller context.
 *
 * 1. Register a seller account and use an authenticated seller connection.
 * 2. Request tracking for a nonexistent shipment ID and expect a not-found error.
 * 3. Request tracking for a second invalid shipment ID and expect an access-denied error.
 */
export async function test_api_shipment_tracking_missing_or_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const missingShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "missing shipment should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.shipments.tracking.at(
        sellerConnection,
        {
          shipmentId: missingShipmentId,
        },
      );
    },
  );
  const inaccessibleShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "inaccessible shipment should reject access",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.seller.shipments.tracking.at(
        sellerConnection,
        {
          shipmentId: inaccessibleShipmentId,
        },
      );
    },
  );
}
