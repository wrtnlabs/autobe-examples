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

export async function test_api_order_shipment_creation_with_in_transit_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as admin (create new connection)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Generate a unique UUID for the order ID
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a shipment with status "in transit" and specified date
  const shipping_date = typia.random<string & tags.Format<"date-time">>();
  const shipment =
    await generate_random_ecommerce_admin_orders_shipments_create(
      adminConnection,
      {
        params: { orderId },
        body: {
          carrier: "DHL",
          tracking_number: typia.random<string & tags.Format<"uuid">>(),
          shipping_date,
          status: "in transit",
        } satisfies IEcommerceShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 4. Validate shipment details
  TestValidator.predicate(
    "tracking number is defined",
    shipment.tracking_number != null && shipment.tracking_number !== undefined,
  );
  TestValidator.predicate(
    "tracking number is string",
    typeof shipment.tracking_number === "string",
  );
  TestValidator.equals(
    "shipping date matches",
    shipment.shipping_date,
    shipping_date,
  );
  TestValidator.equals("status matches", shipment.status, "in transit");
}
