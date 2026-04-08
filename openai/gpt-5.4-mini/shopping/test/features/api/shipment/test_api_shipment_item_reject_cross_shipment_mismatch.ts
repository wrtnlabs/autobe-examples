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
import { generate_random_mall_platform_seller_shipments_create } from "../../../generate/generate_random_mall_platform_seller_shipments_create";
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";

/**
 * Rejects deleting a shipment item when the item does not belong to the given shipment.
 *
 * This test validates the cross-shipment integrity rule for seller shipment-item deletion.
 * It prepares two distinct shipments under the same authenticated seller, then attempts to
 * delete one shipment by pairing its parent shipment ID with an unrelated UUID-shaped item ID.
 *
 * The scenario focuses on business-rule enforcement rather than type validation. Because the
 * available SDK surface does not expose shipment-item detail identifiers separately from the
 * shipment aggregate, the test uses a syntactically valid but unrelated UUID as the mismatched
 * shipment-item target and verifies that the delete call is rejected.
 *
 * 1. Register and authenticate a seller using the dedicated authorization helper.
 * 2. Create two separate shipments with valid request bodies.
 * 3. Attempt to delete a shipment item using a mismatched shipment/item pairing.
 * 4. Confirm the delete request fails as a business-rule violation.
 */
export async function test_api_shipment_item_reject_cross_shipment_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedSellerConnection.headers = {
    Authorization: seller.token.access,
  };
  const firstShipment =
    await api.functional.mallPlatform.seller.shipments.create(
      authenticatedSellerConnection,
      {
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IMallPlatformShipment.ICreate,
      },
    );
  typia.assert(firstShipment);
  const secondShipment =
    await api.functional.mallPlatform.seller.shipments.create(
      authenticatedSellerConnection,
      {
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IMallPlatformShipment.ICreate,
      },
    );
  typia.assert(secondShipment);
  await TestValidator.error(
    "cross-shipment shipment-item deletion should be rejected",
    async () => {
      await api.functional.mallPlatform.seller.shipments.items.erase(
        authenticatedSellerConnection,
        {
          shipmentId: firstShipment.id,
          shipmentItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  TestValidator.notEquals(
    "two created shipments should remain distinct",
    firstShipment.id,
    secondShipment.id,
  );
}
