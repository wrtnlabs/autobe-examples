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

export async function test_api_order_shipment_update_status_transition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Create order ID
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create shipment with 'shipped' status
  const shipment =
    await generate_random_ecommerce_admin_orders_shipments_create(
      adminConnection,
      {
        body: {
          carrier: "FedEx",
          tracking_number: typia.random<string>(),
          shipping_date: new Date().toISOString(),
          status: "shipped",
        } satisfies IEcommerceShipment.ICreate,
        params: { orderId },
      },
    );
  typia.assert(shipment);
  // 4. Update shipment status to 'in transit'
  const updatedShipment =
    await api.functional.ecommerce.admin.orders.shipments.update(
      adminConnection,
      {
        orderId,
        id: shipment.id,
        body: {
          status: "in transit",
        } satisfies IEcommerceShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);
  // 5. Verify status
  TestValidator.equals(
    "Status should be 'in transit' after update",
    updatedShipment.status,
    "in transit",
  );
  // 6. Verify carrier and tracking remain unchanged
  TestValidator.equals(
    "Carrier should remain unchanged",
    updatedShipment.carrier,
    shipment.carrier,
  );
  TestValidator.equals(
    "Tracking number should remain unchanged",
    updatedShipment.tracking_number,
    shipment.tracking_number,
  );
  // 7. Verify timestamps
  TestValidator.predicate(
    "Updated time should be after original timestamp",
    new Date(updatedShipment.updated_at) > new Date(shipment.updated_at),
  );
}
