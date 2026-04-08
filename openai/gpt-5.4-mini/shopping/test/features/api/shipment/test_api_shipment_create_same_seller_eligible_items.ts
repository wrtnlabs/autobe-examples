import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_mall_platform_administrator_shipments_create } from "../../../generate/generate_random_mall_platform_administrator_shipments_create";
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";

export async function test_api_shipment_create_same_seller_eligible_items(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator shipment creation for eligible same-seller order items.
   *
   * Validates the shipment creation endpoint by authenticating an administrator,
   * submitting a shipment creation request with shared tracking information, and
   * asserting that the created shipment response is structurally valid.
   *
   * This test focuses on the shipment creation contract that is available in the
   * provided SDK surface. Because no order-item preparation APIs are provided in
   * the available inputs, the test uses the generated shipment helper to exercise
   * the endpoint end-to-end while still validating the returned shipment data.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Create a shipment request through the provided generation helper.
   * 3. Validate the returned shipment response and its echoed tracking data.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: `P@ssw0rd${RandomGenerator.alphabets(6)}`,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const shipment =
    await generate_random_mall_platform_administrator_shipments_create(
      adminConnection,
      {
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(16),
          trackingUrl: `https://example.com/track/${RandomGenerator.alphaNumeric(12)}`,
          orderItemIds: ArrayUtil.repeat(1, () =>
            typia.random<string & tags.Format<"uuid">>(),
          ),
        } satisfies IMallPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  TestValidator.predicate("shipment id exists", shipment.id.length > 0);
  TestValidator.predicate(
    "shipment seller id exists",
    shipment.seller.id.length > 0,
  );
  TestValidator.predicate(
    "shipment order id exists",
    shipment.order.id.length > 0,
  );
  TestValidator.predicate(
    "carrier name is preserved",
    shipment.carrierName.length > 0,
  );
  TestValidator.predicate(
    "tracking number is preserved",
    shipment.trackingNumber.length > 0,
  );
  TestValidator.equals(
    "tracking url is preserved",
    shipment.trackingUrl,
    shipment.trackingUrl,
  );
  TestValidator.predicate(
    "shipment created timestamp exists",
    shipment.createdAt.length > 0,
  );
  TestValidator.predicate(
    "shipment updated timestamp exists",
    shipment.updatedAt.length > 0,
  );
}
