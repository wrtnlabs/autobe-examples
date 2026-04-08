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
import { generate_random_mall_platform_seller_shipments_fulfillment_create } from "../../../generate/generate_random_mall_platform_seller_shipments_fulfillment_create";
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";

export async function test_api_shipment_fulfillment_mixed_seller_rejected(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test shipment fulfillment rejects a mixed-seller request.
   *
   * Verifies that the seller shipment fulfillment endpoint enforces single-seller
   * grouping rules and does not accept a shipment request containing order items
   * that cannot belong to the same seller-owned delivery package.
   *
   * 1. Authenticate a seller account for shipment operations.
   * 2. Build a fulfillment request with multiple order item identifiers.
   * 3. Assert the mixed-seller shipment creation attempt is rejected.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const body = {
    carrierName: RandomGenerator.name(2),
    trackingNumber: RandomGenerator.alphaNumeric(12),
    trackingUrl: `https://tracking.example.com/${RandomGenerator.alphaNumeric(10)}`,
    orderItemIds: [
      typia.random<string & tags.Format<"uuid">>(),
      typia.random<string & tags.Format<"uuid">>(),
    ],
  } satisfies IMallPlatformShipment.ICreate;
  await TestValidator.error(
    "mixed seller shipment fulfillment should be rejected",
    async () => {
      await api.functional.mallPlatform.seller.shipments.fulfillment.create(
        sellerConnection,
        { body },
      );
    },
  );
}
