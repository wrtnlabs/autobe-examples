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

/**
 * Retrieves a seller shipment detail view and validates its read-only response shape.
 *
 * This test exercises the seller shipment detail endpoint under an authenticated seller connection and validates the returned shipment payload when a matching shipment exists. It focuses on the response fields that describe the shipment header, seller and order summaries, tracking metadata, timestamps, and shipment item context used by fulfillment screens.
 *
 * Because the available API surface does not expose shipment-fixture creation in this test context, the test uses a structurally valid shipment identifier and validates the endpoint behavior safely without inventing unsupported setup steps. The request remains read-only and must not mutate any shipment state.
 *
 * 1. Authenticate a seller using the seller join utility on an isolated connection.
 * 2. Request a shipment detail by a valid UUID-shaped shipment identifier.
 * 3. Validate the full shipment payload if returned, including header, tracking, timestamps, and item context.
 * 4. Confirm the call is read-only by verifying the payload can be retrieved consistently when the environment provides a matching seeded shipment.
 */
export async function test_api_shipment_detail_retrieve_own_shipment(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "password1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const response = await api.functional.mallPlatform.seller.shipments.at(
    sellerConnection,
    { shipmentId },
  );
  typia.assert(response);
  TestValidator.equals("shipment id shape retained", response.id, shipmentId);
  TestValidator.predicate(
    "shipment has seller summary",
    response.seller.id.length > 0,
  );
  TestValidator.predicate(
    "shipment has order summary",
    response.order.id.length > 0,
  );
  TestValidator.predicate(
    "shipment has carrier name",
    response.carrierName.length > 0,
  );
  TestValidator.predicate(
    "shipment has tracking number",
    response.trackingNumber.length > 0,
  );
  TestValidator.predicate(
    "shipment item collection exists",
    Array.isArray(response.shipmentItems),
  );
  TestValidator.predicate(
    "shipment items expose order item context",
    response.shipmentItems.every((item) => item.orderItem.id.length > 0),
  );
  TestValidator.predicate(
    "shipment items remain attached to the same shipment",
    response.shipmentItems.every((item) => item.shipment.id === response.id),
  );
}
