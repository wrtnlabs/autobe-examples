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

/**
 * Test seller shipment fulfillment response creation with shared tracking data.
 *
 * Validates that an authenticated seller can call the shipment fulfillment
 * endpoint and receive a shipment record containing the shared carrier and
 * tracking details expected by customer-facing shipment history views. The test
 * uses the available API surface only and avoids relying on unavailable order
 * creation helpers or unlisted DTO fields.
 *
 * 1. Register and authenticate a fresh seller account.
 * 2. Create a fulfillment request with valid shared tracking information and
 *    at least one order item identifier value.
 * 3. Verify the response preserves the submitted tracking data and returns a
 *    shipment object that can be consumed by downstream order-history views.
 */
export async function test_api_shipment_fulfillment_same_seller_success(
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
  const body = {
    carrierName: RandomGenerator.name(),
    trackingNumber: RandomGenerator.alphaNumeric(12),
    trackingUrl: null,
    orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
  } satisfies IMallPlatformShipment.ICreate;
  const shipment =
    await api.functional.mallPlatform.seller.shipments.fulfillment.create(
      sellerConnection,
      {
        body,
      },
    );
  typia.assert(shipment);
  TestValidator.equals(
    "carrier name should match request",
    shipment.carrierName,
    body.carrierName,
  );
  TestValidator.equals(
    "tracking number should match request",
    shipment.trackingNumber,
    body.trackingNumber,
  );
  TestValidator.equals(
    "tracking url should match request",
    shipment.trackingUrl,
    body.trackingUrl ?? null,
  );
  TestValidator.predicate(
    "shipment id should be present",
    shipment.id.length > 0,
  );
  TestValidator.predicate(
    "shipment seller should be present",
    shipment.seller.id.length > 0,
  );
  TestValidator.predicate(
    "shipment order should be present",
    shipment.order.id.length > 0,
  );
}
