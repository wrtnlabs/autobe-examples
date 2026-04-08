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
import { generate_random_mall_platform_seller_shipments_create } from "../../../generate/generate_random_mall_platform_seller_shipments_create";
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";
import { prepare_random_mall_platform_shipment_item } from "../../../prepare/prepare_random_mall_platform_shipment_item";

/**
 * Test shipment-item retrieval fails for deleted or unavailable associations.
 *
 * Validates that a seller-authenticated workflow can establish shipment context and that a shipment-item association marked unavailable cannot be retrieved through the shipment-item detail endpoint.
 *
 * Because the provided SDK surface does not include a shipment-item delete operation, the test exercises the not-found behavior using an unavailable shipment-item identifier while preserving the seller-owned shipment context.
 *
 * 1. Register and authenticate a seller on an isolated connection.
 * 2. Create a shipment owned by that seller for setup.
 * 3. Retrieve the created shipment-item identifier when available, then use an unavailable identifier pair for the negative lookup.
 * 4. Assert the shipment-item detail endpoint responds with not-found.
 */
export async function test_api_shipment_item_retrieve_deleted_item_not_found(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail: string = `${RandomGenerator.alphabets(8)}@test.com`;
  const sellerPassword: string = `pw-${RandomGenerator.alphaNumeric(12)}`;
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const shipment = await api.functional.mallPlatform.seller.shipments.create(
    sellerConnection,
    {
      body: {
        shipmentItems: [],
        carrierName: "Test Carrier",
        trackingNumber: RandomGenerator.alphaNumeric(16),
      } satisfies IMallPlatformShipment.ICreate,
    },
  );
  typia.assert(shipment);
  const shipmentItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "deleted shipment item should not be retrievable",
    [404],
    async () => {
      await api.functional.mallPlatform.seller.shipments.shipmentItems.at(
        sellerConnection,
        {
          shipmentId: shipment.id,
          shipmentItemId,
        },
      );
    },
  );
}
