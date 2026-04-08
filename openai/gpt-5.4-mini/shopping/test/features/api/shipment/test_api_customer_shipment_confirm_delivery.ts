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
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Confirm shipment delivery for the authenticated customer and verify the returned shipment payload.
 *
 * This test exercises the shipment delivery confirmation endpoint for a customer-authenticated session and validates that the API returns a shipment-shaped response after the confirmation request is issued.
 *
 * 1. Customer registers a fresh account using the provided join utility.
 * 2. Customer invokes shipment delivery confirmation with a valid UUID-shaped shipment identifier.
 * 3. Validates the returned shipment payload structure and key shipment lifecycle fields.
 */
export async function test_api_customer_shipment_confirm_delivery(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/signup",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const shipment =
    await api.functional.mallPlatform.customer.shipments.confirm_delivery.create(
      customerConnection,
      {
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(shipment);
  TestValidator.predicate(
    "shipment id should be a non-empty uuid string",
    shipment.id.length > 0,
  );
  TestValidator.predicate(
    "shipment status should be populated",
    shipment.status.length > 0,
  );
  TestValidator.predicate(
    "shipment should include an order reference",
    shipment.order.id.length > 0,
  );
  TestValidator.predicate(
    "shipment should include seller information",
    shipment.seller.id.length > 0,
  );
  TestValidator.predicate(
    "shipment should include shipment items",
    Array.isArray(shipment.shipmentItems),
  );
}
