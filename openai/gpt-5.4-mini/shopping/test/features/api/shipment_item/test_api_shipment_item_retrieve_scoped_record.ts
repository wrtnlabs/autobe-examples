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
 * Retrieve a shipment item scoped to a specific shipment for customer tracking.
 *
 * Validates that an authenticated customer can call the shipment-item detail endpoint and receive a shipment-item association payload that is properly scoped to the requested shipment identifier. The test focuses on the returned identifiers, parent shipment linkage, linked order-item linkage, and active-row timestamp state.
 *
 * Because only the retrieval endpoint and customer sign-up dependency are available in the provided API surface, this test concentrates on the response contract and access path behavior that can be validated without mutating shipment state.
 *
 * 1. Register and authenticate a customer session.
 * 2. Request a shipment-item record using UUID path parameters.
 * 3. Validate the response payload and shipment scoping fields.
 */
export async function test_api_shipment_item_retrieve_scoped_record(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const shipmentItemId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.customer.shipments.shipmentItems.at(
      customerConnection,
      {
        shipmentId,
        shipmentItemId,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "shipment item id matches request",
    output.id,
    shipmentItemId,
  );
  TestValidator.equals(
    "shipment id matches request",
    output.shipment.id,
    shipmentId,
  );
  TestValidator.predicate(
    "shipment item is active",
    output.deleted_at === null,
  );
  TestValidator.predicate(
    "shipment reference is present",
    output.shipment.id.length > 0,
  );
  TestValidator.predicate(
    "order item reference is present",
    output.orderItem.id.length > 0,
  );
}
