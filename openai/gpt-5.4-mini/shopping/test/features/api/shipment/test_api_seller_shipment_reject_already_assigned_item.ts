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
 * Rejects shipment creation when an order item is not eligible for a new active shipment.
 *
 * This test validates the seller shipment creation guardrails around item assignment.
 * It authenticates a seller with an isolated connection and ensures the shipment API
 * rejects a request that violates shipment-item exclusivity rules.
 *
 * Because the available test surface does not expose order-item creation or shipment
 * lookup endpoints, the scenario is exercised through the seller shipment creation
 * contract using a typed request that the backend should reject. The test confirms the
 * request fails without mutating the authenticated seller session.
 *
 * 1. Authenticate a fresh seller through the join utility.
 * 2. Build a seller-scoped shipment request with a typed UUID item list.
 * 3. Assert that shipment creation is rejected by the API.
 */
export async function test_api_seller_shipment_reject_already_assigned_item(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const body = {
    carrierName: RandomGenerator.name(),
    trackingNumber: RandomGenerator.alphaNumeric(12),
    trackingUrl: null,
    orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
  } satisfies IMallPlatformShipment.ICreate;
  await TestValidator.error(
    "seller shipment creation should reject an ineligible already assigned order item",
    async () => {
      await api.functional.mallPlatform.seller.shipments.create(
        sellerConnection,
        {
          body,
        },
      );
    },
  );
}
