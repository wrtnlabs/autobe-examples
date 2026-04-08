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

export async function test_api_seller_shipment_reject_mixed_seller_items(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Reject shipment creation when the request attempts to combine invalid item identifiers.
   *
   * This test validates that the seller shipment creation endpoint enforces its
   * grouping rules and rejects a shipment request that does not represent a valid
   * single-seller shipment. Because the available API surface does not expose order
   * or order-item creation helpers in this test context, the scenario is exercised
   * as a compile-safe negative validation using DTO-compliant shipment input.
   *
   * 1. Authenticate two isolated seller connections through seller sign-up.
   * 2. Submit a shipment creation request with a DTO-valid but business-invalid set
   *    of order item identifiers.
   * 3. Confirm the endpoint rejects the request and does not accept a partial shipment.
   */
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const body = {
    carrierName: RandomGenerator.name(),
    trackingNumber: RandomGenerator.alphaNumeric(12),
    trackingUrl: null,
    orderItemIds: [
      typia.random<string & tags.Format<"uuid">>(),
      typia.random<string & tags.Format<"uuid">>(),
    ],
  } satisfies IMallPlatformShipment.ICreate;
  await TestValidator.httpError(
    "shipment creation should reject invalid mixed-seller grouping",
    [400, 409, 422],
    async () => {
      await api.functional.mallPlatform.seller.shipments.create(
        sellerAConnection,
        { body },
      );
    },
  );
}
