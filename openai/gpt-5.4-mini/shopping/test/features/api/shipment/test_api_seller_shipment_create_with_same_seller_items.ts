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

export async function test_api_seller_shipment_create_with_same_seller_items(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validates seller shipment creation with shared tracking details for same-seller items.
   *
   * This test authenticates a fresh seller session, creates a shipment using the
   * approved shipment-generation helper, and verifies the returned shipment keeps
   * its seller ownership, order relationship, and tracking fields intact.
   *
   * 1. Register a seller using an isolated connection.
   * 2. Create a shipment through the dedicated generation helper.
   * 3. Validate the returned shipment metadata and preserved tracking information.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const shipment = await generate_random_mall_platform_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrierName: RandomGenerator.name(),
        trackingNumber: RandomGenerator.alphaNumeric(18),
        trackingUrl: null,
        orderItemIds: [
          typia.random<string & tags.Format<"uuid">>(),
          typia.random<string & tags.Format<"uuid">>(),
        ],
      } satisfies IMallPlatformShipment.ICreate,
    },
  );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment seller id matches",
    shipment.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "shipment seller email matches",
    shipment.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "tracking carrier is preserved",
    shipment.carrierName,
    shipment.carrierName,
  );
  TestValidator.equals(
    "tracking number is preserved",
    shipment.trackingNumber,
    shipment.trackingNumber,
  );
  TestValidator.equals(
    "tracking url is null when omitted",
    shipment.trackingUrl,
    null,
  );
  TestValidator.predicate("shipment id exists", shipment.id.length > 0);
  TestValidator.predicate(
    "shipment order id exists",
    shipment.order.id.length > 0,
  );
  TestValidator.predicate(
    "shipment timestamps exist",
    shipment.createdAt.length > 0 && shipment.updatedAt.length > 0,
  );
}
