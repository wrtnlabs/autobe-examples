import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator viewing a shipment with multiple order items bundled together.
 *
 * Validates the shipment composition business rule where a seller can bundle multiple
 * items from the same seller into one shipment. After admin authentication, the shipment
 * is retrieved and the response should include all order items in the shipment_items array.
 *
 * 1. Administrator registers and authenticates with the system.
 * 2. Administrator views a specific shipment within an order.
 * 3. Validates the shipment contains one or more order items.
 * 4. Validates all items in the shipment share the same tracking information.
 * 5. Validates all items belong to the same seller (shipment composition rule).
 * 6. Validates the shipment is properly linked to its parent order.
 */
export async function test_api_admin_view_shipment_with_multiple_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. View shipment with multiple items
  const orderId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  const shipmentId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  const shipment: IEcommerceShipment =
    await api.functional.ecommerce.admin.orders.shipments.at(adminConnection, {
      orderId,
      shipmentId,
    });
  typia.assert(shipment);
  // 3. Validate shipment has at least one item
  TestValidator.predicate(
    "shipment contains at least one item",
    shipment.shipment_items.length >= 1,
  );
  // 4. Validate shipment is linked to the correct order
  TestValidator.equals(
    "shipment belongs to specified order",
    shipment.order.id,
    orderId,
  );
  // 5. Validate all items belong to the same seller (shipment composition rule)
  const sellerId: string = shipment.seller.id;
  for (const item of shipment.shipment_items) {
    TestValidator.equals(
      "all items belong to same seller",
      sellerId,
      item.order_item.seller.id,
    );
  }
  // 6. Validate shipment has valid tracking information
  TestValidator.predicate(
    "shipment has carrier name",
    shipment.carrier_name.length > 0,
  );
  TestValidator.predicate(
    "shipment has tracking number",
    shipment.tracking_number.length > 0,
  );
  // 7. Validate shipment status is valid
  TestValidator.predicate(
    "shipment has valid status",
    shipment.status.length > 0,
  );
}
