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
import { generate_random_mall_platform_seller_shipments_shipment_items_create } from "../../../generate/generate_random_mall_platform_seller_shipments_shipment_items_create";
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";
import { prepare_random_mall_platform_shipment_item } from "../../../prepare/prepare_random_mall_platform_shipment_item";

/**
 * Test seller shipment item assignment success flow.
 *
 * Verifies that an authenticated seller can create a shipment header and then
 * assign shipment items through the dedicated shipment-item endpoint. The test
 * focuses on the happy-path response contract and confirms that the created
 * assignment is linked back to the expected shipment.
 *
 * 1. Register and authenticate a seller account.
 * 2. Create a shipment header for that seller.
 * 3. Attach one or more order-item identifiers to the existing shipment.
 * 4. Validate the returned shipment-item assignment links back to the shipment.
 */
export async function test_api_shipment_item_assignment_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: "1234" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const shipment = await generate_random_mall_platform_seller_shipments_create(
    sellerConnection,
    {
      body: {
        shipmentItems: ArrayUtil.repeat(1, () => ({
          orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
        })),
        carrierName: RandomGenerator.name(),
        trackingNumber: RandomGenerator.alphaNumeric(12),
      } satisfies IMallPlatformShipment.ICreate,
    },
  );
  typia.assert(shipment);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const assigned =
    await generate_random_mall_platform_seller_shipments_shipment_items_create(
      sellerConnection,
      {
        params: {
          shipmentId: shipment.id,
        },
        body: {
          orderItemIds: [orderItemId],
        } satisfies IMallPlatformShipmentItem.ICreate,
      },
    );
  typia.assert(assigned);
  TestValidator.equals(
    "shipment id should match",
    assigned.shipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "carrier name should remain unchanged",
    assigned.shipment.carrierName,
    shipment.carrierName,
  );
  TestValidator.equals(
    "tracking number should remain unchanged",
    assigned.shipment.trackingNumber,
    shipment.trackingNumber,
  );
  TestValidator.predicate(
    "shipment item should reference the created shipment",
    assigned.shipment.id === shipment.id,
  );
  TestValidator.equals(
    "order item id should match the request",
    assigned.orderItem.id,
    orderItemId,
  );
}
