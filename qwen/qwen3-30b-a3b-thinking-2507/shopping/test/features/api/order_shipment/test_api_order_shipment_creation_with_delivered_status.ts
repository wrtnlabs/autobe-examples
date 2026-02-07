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

export async function test_api_order_shipment_creation_with_delivered_status(
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
  // 2. Create shipment with 'delivered' status
  const shipment =
    await generate_random_ecommerce_admin_orders_shipments_create(
      adminConnection,
      {
        body: {
          carrier: "USPS",
          tracking_number: RandomGenerator.alphaNumeric(16),
          shipping_date: "2023-10-17T09:15:00Z",
          status: "delivered",
        } satisfies IEcommerceShipment.ICreate,
        params: {
          orderId: "dummy-order-id-" + RandomGenerator.alphaNumeric(8),
        },
      },
    );
  typia.assert(shipment);
  // 3. Validate response
  TestValidator.predicate(
    "actual_delivery_date should be present",
    shipment.actual_delivery_date !== undefined &&
      shipment.actual_delivery_date !== null,
  );
  TestValidator.predicate(
    "actual_delivery_date should be current timestamp (after shipment date)",
    shipment.actual_delivery_date !== undefined && 
    shipment.actual_delivery_date !== null &&
    new Date(shipment.actual_delivery_date) > new Date("2023-10-17T09:15:00Z"),
  );
  TestValidator.equals(
    "status should be 'delivered'",
    shipment.status,
    "delivered",
  );
}