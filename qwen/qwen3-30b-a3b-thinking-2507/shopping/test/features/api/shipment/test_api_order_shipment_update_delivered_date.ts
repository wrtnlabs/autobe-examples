import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_admin_orders_shipments_create } from "../../../generate/generate_random_ecommerce_admin_orders_shipments_create";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

export async function test_api_order_shipment_update_delivered_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Generate a fresh order ID (random UUID)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a shipment with status 'in transit'
  const shipment = await api.functional.ecommerce.admin.orders.shipments.create(
    adminConnection,
    {
      orderId: orderId,
      body: {
        carrier: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(10),
        shipping_date: new Date().toISOString(),
        status: "in transit",
      } satisfies IEcommerceShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 4. Update shipment to delivered status
  const updatedShipment =
    await api.functional.ecommerce.admin.orders.shipments.update(
      adminConnection,
      {
        orderId: orderId,
        id: shipment.id,
        body: {
          status: "delivered",
        } satisfies IEcommerceShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);
  // 5. Validate actual_delivery_date is populated
  TestValidator.predicate(
    "actual_delivery_date should be present",
    updatedShipment.actual_delivery_date !== null &&
      updatedShipment.actual_delivery_date !== undefined,
  );
  // Verify actual_delivery_date is a valid ISO format string
  const actualDeliveryDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  TestValidator.predicate(
    "actual_delivery_date should be valid ISO format",
    actualDeliveryDateRegex.test(updatedShipment.actual_delivery_date!),
  );
  // 6. Validate other data integrity
  TestValidator.equals(
    "carrier matches",
    updatedShipment.carrier,
    shipment.carrier,
  );
  TestValidator.equals(
    "tracking_number matches",
    updatedShipment.tracking_number,
    shipment.tracking_number,
  );
  TestValidator.equals(
    "status updated correctly",
    updatedShipment.status,
    "delivered",
  );
}
