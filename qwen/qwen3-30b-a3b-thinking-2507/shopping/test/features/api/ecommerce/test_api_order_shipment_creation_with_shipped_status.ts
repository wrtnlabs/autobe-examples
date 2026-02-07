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

export async function test_api_order_shipment_creation_with_shipped_status(
  connection: api.IConnection,
) {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Define shipment details with required values
  const trackingNumber: string = typia.random<string>();
  const shippingDate: string = "2023-10-15T08:30:00Z"; // Specific past date
  // 3. Create shipment with required payload
  const shipment = await api.functional.ecommerce.admin.orders.shipments.create(
    adminConnection,
    {
      orderId: typia.random<string>(),
      body: {
        carrier: "FedEx",
        tracking_number: trackingNumber,
        shipping_date:
          shippingDate satisfies IEcommerceShipment.ICreate["shipping_date"],
        status: "shipped" satisfies IEcommerceShipment.ICreate["status"],
      } satisfies IEcommerceShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 4. Validate response
  TestValidator.equals("Carrier matches", shipment.carrier, "FedEx");
  TestValidator.equals(
    "Tracking number matches",
    shipment.tracking_number,
    trackingNumber,
  );
  TestValidator.equals(
    "Shipping date matches",
    shipment.shipping_date,
    shippingDate,
  );
  TestValidator.equals("Status matches", shipment.status, "shipped");
}
