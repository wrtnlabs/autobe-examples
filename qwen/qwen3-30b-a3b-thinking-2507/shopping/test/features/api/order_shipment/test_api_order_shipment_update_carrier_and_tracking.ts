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

export async function test_api_order_shipment_update_carrier_and_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create shipment
  const orderId = typia.random<string>();
  const shipment =
    await generate_random_ecommerce_admin_orders_shipments_create(
      adminConnection,
      {
        body: {
          carrier: "USPS",
          tracking_number: RandomGenerator.alphaNumeric(12),
          shipping_date: new Date().toISOString(),
          status: "shipped",
        },
        params: { orderId },
      },
    );
  // 3. Update shipment
  const updatedShipment =
    await api.functional.ecommerce.admin.orders.shipments.update(
      adminConnection,
      {
        orderId,
        id: shipment.id,
        body: {
          carrier: "FedEx",
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(updatedShipment);
  // 4. Validate update
  TestValidator.equals("carrier updated", updatedShipment.carrier, "FedEx");
  TestValidator.predicate(
    "status unchanged",
    updatedShipment.status === "shipped",
  );
}
